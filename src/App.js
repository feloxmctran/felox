// src/App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPanel from "./pages/AdminPanel";
import EditorPanel from "./pages/EditorPanel";
import UserPanel from "./pages/UserPanel";

import ProtectedRoute, { getFeloxUser } from "./ProtectedRoute";

import DuelloLobby from "./pages/DuelloLobby";
import DuelloMatch from "./pages/DuelloMatch";

/* ---------- Route Wrapper'ları ---------- */
function DuelloLobbyRoute() {
  const [uid, setUid] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getFeloxUser();
      setUid(u?.id || null);
      setReady(true);
    })();
  }, []);

  if (!ready) return <div>Yükleniyor...</div>;
  if (!uid) return <Navigate to="/login" replace />;
  return <DuelloLobby userId={uid} />;
}

function DuelloMatchRoute() {
  const { matchId } = useParams();
  const [uid, setUid] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getFeloxUser();
      setUid(u?.id || null);
      setReady(true);
    })();
  }, []);

  if (!ready) return <div>Yükleniyor...</div>;
  if (!uid) return <Navigate to="/login" replace />;
  return <DuelloMatch matchId={Number(matchId)} userId={uid} />;
}

/* ---------- App ---------- */
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

        {/* Düello Lobi */}
        <Route
          path="/duello"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <DuelloLobbyRoute />
            </ProtectedRoute>
          }
        />

        {/* Düello Maç – iki path de destekleniyor */}
        <Route
          path="/duello/:matchId"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <DuelloMatchRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/duello/match/:matchId"
          element={
            <ProtectedRoute allowedRoles={["USER"]}>
              <DuelloMatchRoute />
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
