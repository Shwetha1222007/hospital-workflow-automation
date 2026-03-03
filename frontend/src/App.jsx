import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import LabDashboard from "./pages/LabDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import BillingDashboard from "./pages/BillingDashboard";



function AppInner() {
  const { user, logout, loading } = useAuth();
  const [role, setRole] = useState(localStorage.getItem("role") || null);

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "#060b14",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#00d4ff", fontFamily: "monospace", fontSize: 16, flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 56, height: 56,
        background: "linear-gradient(135deg,#00d4ff,#0099bb)",
        borderRadius: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, color: "#060b14", fontWeight: 700,
        boxShadow: "0 0 32px rgba(0,212,255,0.3)",
      }}>+</div>
      <div>Initializing MedFlow v5...</div>
    </div>
  );

  const handleLogin = (r) => setRole(r);
  const handleLogout = () => { logout(); setRole(null); };
  const currentRole = user?.role || role;

  if (!user && !role) return <LoginPage onLogin={handleLogin} />;
  if (!currentRole) return <LoginPage onLogin={handleLogin} />;

  const userData = {
    name: user?.full_name || localStorage.getItem("name") || "User",
    role: currentRole,
    id: user?.id,
    extra: user,
  };

  if (currentRole === "PATIENT") return <PatientDashboard user={userData} onLogout={handleLogout} />;
  if (currentRole === "LAB_TECHNICIAN") return <LabDashboard user={userData} onLogout={handleLogout} />;
  if (currentRole === "PHARMACIST") return <PharmacyDashboard user={userData} onLogout={handleLogout} />;
  if (currentRole === "BILLING") return <BillingDashboard user={userData} onLogout={handleLogout} />;
  if (currentRole === "SUPER_ADMIN") return <AdminDashboard user={userData} onLogout={handleLogout} />;
  if (currentRole === "DOCTOR") return <DoctorDashboard user={userData} onLogout={handleLogout} />;
  if (currentRole === "NURSE") return <NurseDashboard user={userData} onLogout={handleLogout} />;


  return <LoginPage onLogin={handleLogin} />;
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
