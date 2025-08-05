// src/ProtectedRoute.js
import React, { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, children }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      // Önce localStorage (web için)
      let userStr = localStorage.getItem("felox_user");
      // Eğer yoksa Preferences'tan (mobil için)
      if (!userStr && Preferences) {
        try {
          const { value } = await Preferences.get({ key: "felox_user" });
          userStr = value;
        } catch (e) {
          userStr = null;
        }
      }
      if (userStr) setUser(JSON.parse(userStr));
      setChecked(true);
    };
    checkUser();
  }, []);

  if (!checked) return <div>Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role?.toUpperCase())) return <Navigate to="/login" />;
  return children;
}
