// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPanel from "./pages/AdminPanel";
import EditorPanel from "./pages/EditorPanel";
import UserPanel from "./pages/UserPanel";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Giriş */}
        <Route path="/login" element={<LoginPage />} />

        {/* Kayıt */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Editor */}
        <Route
          path="/editor"
          element={
            <ProtectedRoute allowedRoles={["EDITOR"]}>
              <EditorPanel />
            </ProtectedRoute>
          }
        />

        {/* User */}
        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <UserPanel />
            </ProtectedRoute>
          }
        />

        {/* root ve bilinmeyen rotalar login'e */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
