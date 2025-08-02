import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = JSON.parse(localStorage.getItem("felox_user"));

  if (!user) {
    // Giriş yapılmamışsa login sayfasına yönlendir
    return <Navigate to="/login" />;
  }
  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    // Yetkisizse ana sayfaya yönlendir
    return <Navigate to="/" />;
  }
  // Yetkiliyse ilgili paneli göster
  return children;
}
