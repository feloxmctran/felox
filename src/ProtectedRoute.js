import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

// getFeloxUser fonksiyonu: hem localStorage hem (mobilde) Capacitor destekler
export async function getFeloxUser() {
  let userStr = localStorage.getItem("felox_user");
  if (
    !userStr &&
    window.Capacitor &&
    (window.Capacitor.isNative || window.Capacitor.isNativePlatform?.())
  ) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key: "felox_user" });
      userStr = value;
    } catch (e) {
      console.error("Capacitor preferences error:", e);
    }
  }
  return userStr ? JSON.parse(userStr) : null;
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getFeloxUser();
      console.log("ProtectedRoute > getFeloxUser result:", u);
      if (mounted) {
        setUser(u);
        setChecked(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  console.log("ProtectedRoute > checked:", checked, "user:", user);

  if (!checked) return <div>Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role?.toUpperCase())) return <Navigate to="/login" />;
  return children;
}
