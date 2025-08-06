import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

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
  localStorage.setItem("felox_user", JSON.stringify(user));
  if (
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  ) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({
        key: "felox_user",
        value: JSON.stringify(user),
      });
    } catch {}
  }
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Otomatik yönlendir
  useEffect(() => {
    getFeloxUser().then((user) => {
      if (user && user.role) {
        const role = user.role.toUpperCase();
        if (role === "USER") navigate("/user");
        else if (role === "EDITOR") navigate("/editor");
        else if (role === "ADMIN") navigate("/admin");
      }
    });
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
