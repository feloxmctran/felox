import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

// Kaç gün boyunca otomatik giriş geçerli olsun? (İstersen 30’u büyüt/küçült, istemezsen null/0 yap)
const AUTO_LOGIN_MAX_DAYS = 30;

// URL query param helper
const qs = (k) => new URLSearchParams(window.location.search).get(k);


const apiUrl = process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

// Web/Mobil universal getter
async function getFeloxUser() {
  let userStr = localStorage.getItem("felox_user");
  // Eğer mobil platformdaysa Preferences'tan oku
  if (
    (!userStr) &&
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  ) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key: "felox_user" });
      userStr = value;
    } catch {}
  }
  return userStr ? JSON.parse(userStr) : null;
}

// Universal setter (web + mobil)
async function setFeloxUser(user) {
  const payload = { ...user, _lastLoginTs: Date.now() }; // ⬅️ son giriş zamanı
  localStorage.setItem("felox_user", JSON.stringify(payload));
  if (
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  ) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({
        key: "felox_user",
        value: JSON.stringify(payload),
      });
    } catch {}
  }
}


export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Otomatik yönlendir (Kullanıcı gerçekten backend'de varsa!)
  useEffect(() => {
  (async () => {
    // 3.a) URL ile login’i zorla göster: /login?force=1
    if (qs("force") === "1") return;

    // 3.b) Kaydedilmiş kullanıcıyı al
    const user = await getFeloxUser();
    if (!user || !user.id || !user.role) return;

    // 3.c) Süre sınırı (opsiyonel): 30 gün geçtiyse otomatik geçiş yapma
    if (AUTO_LOGIN_MAX_DAYS && Number.isFinite(AUTO_LOGIN_MAX_DAYS)) {
      const last = Number(user._lastLoginTs || 0);
      const freshMs = AUTO_LOGIN_MAX_DAYS * 24 * 60 * 60 * 1000;
      if (!last || (Date.now() - last) > freshMs) {
        return; // form görünsün
      }
    }

    // 3.d) Backend doğrula: kullanıcı gerçekten var mı?
    try {
      const res = await fetch(`${apiUrl}/api/user/${user.id}/exists`);
      const data = await res.json();
      if (!data.exists) {
        // bozuk kayıt -> temizle
        localStorage.removeItem("felox_user");
        if (
          window.Capacitor &&
          (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
        ) {
          try {
            const { Preferences } = await import("@capacitor/preferences");
            await Preferences.remove({ key: "felox_user" });
          } catch {}
        }
        return;
      }

      // 3.e) Rolüne göre yönlendir
      const role = String(user.role).toUpperCase();
      const path = role === "ADMIN" ? "/admin" : role === "EDITOR" ? "/editor" : "/user";
      navigate(path, { replace: true });
    } catch {
      // Sunucuya ulaşılamazsa, formu göster (sessiz kal)
    }
  })();
}, [navigate]);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!form.email || !form.password) {
      setMessage("Lütfen e-posta ve şifre girin.");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        await setFeloxUser(data.user);
        const role = data.user.role?.toUpperCase();
        if (role === "USER") navigate("/user");
        else if (role === "EDITOR") navigate("/editor");
        else if (role === "ADMIN") navigate("/admin");
        else setMessage("Bilinmeyen rol!");
      } else {
        setMessage(data.error || "Giriş başarısız.");
      }
    } catch (err) {
      setMessage("Sunucuya bağlanılamıyor.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <Logo />
        <h2 className="text-3xl font-bold mb-6 text-center text-sky-700">Giriş Yap</h2>
        
        {message && (
          <div className="mb-4 text-center text-sm text-red-600">{message}</div>
        )}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            type="email"
            name="email"
            placeholder="E-posta"
            value={form.email}
            onChange={handleChange}
          />
          <input
            className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            type="password"
            name="password"
            placeholder="Şifre"
            value={form.password}
            onChange={handleChange}
          />
          <button
            className="bg-sky-600 text-white rounded-xl p-3 font-semibold hover:bg-sky-700 transition mt-2"
            type="submit"
          >
            Giriş Yap
          </button>
        </form>
        <div className="text-center mt-4 text-gray-500">
          Hesabınız yok mu?{" "}
          <a href="/register" className="text-sky-700 underline">
            Kayıt Ol
          </a>
        </div>
      </div>
    </div>
  );
}
