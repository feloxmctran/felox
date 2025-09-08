import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

// Platform tespiti (web/mobil)
function isNative() {
  return !!(window.Capacitor && (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.()));
}
async function setFeloxUser(user) {
  localStorage.setItem("felox_user", JSON.stringify(user));
  if (isNative()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({
        key: "felox_user",
        value: JSON.stringify(user),
      });
    } catch (e) {}
  }
}

const apiUrl = process.env.REACT_APP_API_URL || "https://felox-backend.onrender.com";

export default function RegisterPage() {
  const [form, setForm] = useState({
    ad: "",
    soyad: "",
    yas: "",
    cinsiyet: "",
    meslek: "",
    sehir: "",
    email: "",
    sifre: ""
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Basit doğrulama
    if (
      !form.ad ||
      !form.soyad ||
      !form.yas ||
      !form.cinsiyet ||
      !form.meslek ||
      !form.sehir ||
      !form.email ||
      !form.sifre
    ) {
      setMessage("Lütfen tüm alanları doldurun.");
      return;
    }

    const toSend = {
      ad: form.ad,
      soyad: form.soyad,
      yas: form.yas,
      cinsiyet: form.cinsiyet,
      meslek: form.meslek,
      sehir: form.sehir,
      email: form.email,
      password: form.sifre,
      role: "USER"
    };

    try {
      // 1) Register isteği
      const res = await fetch(`${apiUrl}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSend),
      });
      const data = await res.json();

      if (data.success && data.user) {
        // 2) Kayıt başarılıysa, otomatik login
        const loginRes = await fetch(`${apiUrl}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.sifre,
          }),
        });
        const loginData = await loginRes.json();

        if (loginData.success && loginData.user) {
          await setFeloxUser(loginData.user);
          // role yönlendirme
          if (loginData.user.role && loginData.user.role.toUpperCase() === "USER") {
            navigate("/user");
          } else if (loginData.user.role && loginData.user.role.toUpperCase() === "EDITOR") {
            navigate("/editor");
          } else if (loginData.user.role && loginData.user.role.toUpperCase() === "ADMIN") {
            navigate("/admin");
          } else {
            setMessage("Kayıt başarılı, ancak rol tanımsız!");
          }
        } else {
          setMessage("Kayıt başarılı ama girişte hata: " + (loginData.error || ""));
        }
      } else if (data.error) {
        setMessage(data.error || "Kayıt sırasında bir hata oluştu.");
      } else {
        setMessage("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        setForm({
          ad: "",
          soyad: "",
          yas: "",
          cinsiyet: "",
          meslek: "",
          sehir: "",
          email: "",
          sifre: ""
        });
      }
    } catch (err) {
      setMessage("Sunucuya bağlanılamıyor.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-400 to-green-700">
      <div className="bg-white/90 rounded-2xl shadow-xl p-8 w-full max-w-md">
  {/* BİLGİKÜRE brand */}
  <div className="flex flex-col items-center mb-4">
    <div className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 12h18M12 3v18M5 7.5h14M5 16.5h14M9 3s-2 3.5-2 9 2 9 2 9m6-18s2 3.5 2 9-2 9-2 9" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
      <span className="text-3xl font-extrabold bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent tracking-wide">
        BİLGİKÜRE
      </span>
    </div>
    <div className="text-[12px] text-gray-500 mt-1">Bilgin kadar yarış, bilgin kadar kazan.</div>
  </div>

  <h2 className="text-3xl font-bold mb-6 text-center text-emerald-700">Kayıt Ol</h2>

        {message && (
          <div className="mb-4 text-center text-sm text-red-600">{message}</div>
        )}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input className="border p-3 rounded-xl" placeholder="Ad" name="ad" value={form.ad} onChange={handleChange} />
          <input className="border p-3 rounded-xl" placeholder="Soyad" name="soyad" value={form.soyad} onChange={handleChange} />
          <input className="border p-3 rounded-xl" type="number" placeholder="Yaş" name="yas" value={form.yas} onChange={handleChange} />
          <select className="border p-3 rounded-xl text-gray-500" name="cinsiyet" value={form.cinsiyet} onChange={handleChange}>
            <option value="">Cinsiyet</option>
            <option value="erkek">Erkek</option>
            <option value="kadin">Kadın</option>
            
          </select>
          <input className="border p-3 rounded-xl" placeholder="Meslek" name="meslek" value={form.meslek} onChange={handleChange} />
          <input className="border p-3 rounded-xl" placeholder="Şehir" name="sehir" value={form.sehir} onChange={handleChange} />
          <input className="border p-3 rounded-xl" type="email" placeholder="E-posta" name="email" value={form.email} onChange={handleChange} />
          <input className="border p-3 rounded-xl" type="password" placeholder="Şifre" name="sifre" value={form.sifre} onChange={handleChange} />
          <button className="bg-emerald-600 text-white rounded-xl p-3 font-semibold hover:bg-emerald-700 transition mt-2" type="submit">
            Kayıt Ol
          </button>
        </form>
        <div className="text-center mt-4 text-gray-500">
          Zaten hesabın var mı? <a href="/login" className="text-emerald-700 underline">Giriş Yap</a>
        </div>

        <div className="mt-6 text-center select-none">
  <span className="text-[11px] text-gray-400 mr-1 align-baseline">powered by</span>
  <span className="inline-block align-baseline scale-75 opacity-80">
    <Logo />
  </span>
</div>

      </div>
    </div>
  );
}
