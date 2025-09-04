// src/pages/LoginPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

/**
 * Otomatik giriş süresi (rolling window). 0/null => sınırsız.
 * İstersen 7/14/60 gün yapabilirsin.
 */
const AUTO_LOGIN_MAX_DAYS = 30;

/** Sunucu doğrulaması başarısızsa da (ör. offline) otomatik geçişe izin ver */
const ALLOW_OFFLINE_AUTOLOGIN = true;

/** URL query helper */
const qs = (k) => new URLSearchParams(window.location.search).get(k);

const apiUrl =
  process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

/** Ortak: Native mi? */
const isNative = () =>
  !!(
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  );

/** Web/Mobil universal getter */
async function getFeloxUser() {
  let userStr = localStorage.getItem("felox_user");
  if (!userStr && isNative()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key: "felox_user" });
      userStr = value;
    } catch {}
  }
  return userStr ? JSON.parse(userStr) : null;
}

/** Web/Mobil universal setter (+ lastLoginTs güncelle) */
async function setFeloxUser(user) {
  const payload = { ...user, _lastLoginTs: Date.now() };
  localStorage.setItem("felox_user", JSON.stringify(payload));
  if (isNative()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({
        key: "felox_user",
        value: JSON.stringify(payload),
      });
    } catch {}
  }
}

/** Sadece lastLoginTs'i güncelle (rolling window uzasın) */
async function touchFeloxUser() {
  const u = await getFeloxUser();
  if (u) await setFeloxUser(u);
}

/** Rol → route */
function roleToPath(roleRaw) {
  const role = String(roleRaw || "").toUpperCase();
  if (role === "ADMIN") return "/admin";
  if (role === "EDITOR") return "/editor";
  return "/user";
}

/** Oturum taze mi? */
function isFresh(user) {
  if (!AUTO_LOGIN_MAX_DAYS || !Number.isFinite(AUTO_LOGIN_MAX_DAYS)) return true;
  const last = Number(user?._lastLoginTs || 0);
  if (!last) return false;
  const freshMs = AUTO_LOGIN_MAX_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - last <= freshMs;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Oto-yönlendirme (kayıt varsa ve tazeyse)
  useEffect(() => {
    (async () => {
      if (qs("force") === "1") return; // query ile formu zorla göster

      const saved = await getFeloxUser();
      if (!saved || !saved.id || !saved.role) return;
      if (!isFresh(saved)) return;

      const path = roleToPath(saved.role);

      if (navigator.onLine) {
        try {
          const res = await fetch(`${apiUrl}/api/user/${saved.id}/exists`);
          const data = await res.json();
          if (data?.exists) {
            await touchFeloxUser();
            navigate(path, { replace: true });
          }
          return;
        } catch {
          // offline fallback
        }
      }

      if (ALLOW_OFFLINE_AUTOLOGIN) {
        await touchFeloxUser();
        navigate(path, { replace: true });
      }
    })();
  }, [navigate]);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!form.email || !form.password) {
      setMessage("Lütfen e-posta ve şifre girin.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data?.success && data?.user) {
        await setFeloxUser(data.user);
        navigate(roleToPath(data.user.role), { replace: true });
      } else {
        setMessage(data?.error || "Giriş başarısız.");
      }
    } catch {
      setMessage("Sunucuya bağlanılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <Logo />
        <h2 className="text-3xl font-bold mb-6 text-center text-sky-700">
          Giriş Yap
        </h2>

        {/* bilgi kutusu yok */}

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
            autoComplete="email"
            inputMode="email"
          />
          <input
            className="border p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
            type="password"
            name="password"
            placeholder="Şifre"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <button
            className="bg-sky-600 text-white rounded-xl p-3 font-semibold hover:bg-sky-700 transition mt-2 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
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
