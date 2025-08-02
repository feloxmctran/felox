import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPanel from "./pages/AdminPanel";
import EditorPanel from "./pages/EditorPanel";
import UserPanel from "./pages/UserPanel";

// Rol bazlı koruma için bir bileşen
function ProtectedRoute({ allowedRoles, children }) {
  const user = JSON.parse(localStorage.getItem("felox_user"));
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role.toUpperCase())) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Giriş sayfası */}
        <Route path="/login" element={<LoginPage />} />

        {/* Kayıt sayfası */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin Panel */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Editör Panel */}
        <Route
          path="/editor"
          element={
            <ProtectedRoute allowedRoles={["EDITOR"]}>
              <EditorPanel />
            </ProtectedRoute>
          }
        />

        {/* Kullanıcı Panel */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserPanel />
            </ProtectedRoute>
          }
        />

        {/* Herhangi bir bilinmeyen route'a login'e yönlendir */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
