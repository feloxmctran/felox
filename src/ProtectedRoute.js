// src/ProtectedRoute.js
import React, { useState, useEffect } from "react";
import { Preferences } from '@capacitor/preferences";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, children }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { value } = await Storage.get({ key: "felox_user" });
      if (value) setUser(JSON.parse(value));
      setChecked(true);
    };
    fetchUser();
  }, []);

  if (!checked) return <div>Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role.toUpperCase())) return <Navigate to="/login" />;
  return children;
}
