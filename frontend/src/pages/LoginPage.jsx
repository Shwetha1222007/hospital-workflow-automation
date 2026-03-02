import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

<<<<<<< HEAD
const ROLES = [
  { id: "SUPER_ADMIN", label: "Admin", icon: "⚙️", color: "#00d4ff", desc: "System control" },
  { id: "DOCTOR", label: "Doctor", icon: "👨‍⚕️", color: "#22c55e", desc: "Diagnosis & Notes" },
  { id: "NURSE", label: "Nurse", icon: "👩‍⚕️", color: "#f59e0b", desc: "Patient Care" },
  { id: "LAB_TECHNICIAN", label: "Lab Tech", icon: "🧪", color: "#a855f7", desc: "Lab Reports" },
  { id: "PHARMACIST", label: "Pharmacy", icon: "💊", color: "#f97316", desc: "Medications" },
  { id: "BILLING", label: "Billing", icon: "💳", color: "#ec4899", desc: "Bills & Payment" },
];

const DEMO_CREDS = [
  { role: "SUPER_ADMIN", email: "admin@medflow.com", password: "admin123", color: "#00d4ff", label: "Admin" },
  { role: "DOCTOR", email: "dr.sharma@medflow.com", password: "doc123", color: "#22c55e", label: "Doctor" },
  { role: "NURSE", email: "nurse.priya@medflow.com", password: "nurse123", color: "#f59e0b", label: "Nurse" },
  { role: "LAB_TECHNICIAN", email: "lab@medflow.com", password: "lab123", color: "#a855f7", label: "Lab Tech" },
  { role: "PHARMACIST", email: "pharmacy@medflow.com", password: "pharmacy123", color: "#f97316", label: "Pharmacy" },
  { role: "BILLING", email: "billing@medflow.com", password: "billing123", color: "#ec4899", label: "Billing" },
];
=======
const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a0f1e 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 20,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 24, padding: "40px 44px", width: "100%", maxWidth: 440,
    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.05)",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 32,
    justifyContent: "center",
  },
  logoIcon: {
    width: 48, height: 48,
    background: "linear-gradient(135deg,#00d4ff,#0077ff)",
    borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, color: "#fff", fontWeight: 900,
    boxShadow: "0 0 24px rgba(0,212,255,0.35)",
  },
  logoText: { color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: -0.5 },
  toggleRow: {
    display: "flex", background: "rgba(255,255,255,0.05)",
    borderRadius: 12, padding: 4, marginBottom: 28, gap: 4,
  },
  toggleBtn: (active) => ({
    flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: 13, transition: "all 0.2s",
    background: active ? "linear-gradient(135deg,#00d4ff,#0077ff)" : "transparent",
    color: active ? "#0a0f1e" : "rgba(255,255,255,0.5)",
    boxShadow: active ? "0 4px 16px rgba(0,212,255,0.3)" : "none",
  }),
  title: { color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: "center" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 28, textAlign: "center" },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block", letterSpacing: 0.5 },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(0,212,255,0.18)",
    background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box", marginBottom: 18,
    transition: "border-color 0.2s",
  },
  btn: {
    width: "100%", padding: "13px 0",
    background: "linear-gradient(135deg,#00d4ff,#0077ff)",
    border: "none", borderRadius: 12, color: "#0a0f1e",
    fontWeight: 700, fontSize: 15, cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,212,255,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
    marginTop: 4,
  },
  error: {
    background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: 10, padding: "10px 14px", color: "#ff6b6b",
    fontSize: 13, marginBottom: 16, textAlign: "center",
  },
  hint: {
    marginTop: 20, padding: "12px 14px",
    background: "rgba(0,212,255,0.06)", borderRadius: 10,
    border: "1px solid rgba(0,212,255,0.12)",
    color: "rgba(255,255,255,0.45)", fontSize: 11.5, lineHeight: 1.6,
  },
};
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f

export default function LoginPage({ onLogin }) {
  const { loginUser } = useAuth();
  const [mode, setMode] = useState("staff");   // "staff" | "patient"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await loginUser(username.trim(), password);
      onLogin(data.role);
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const placeholderUser = mode === "patient" ? "e.g. PAT001" : "e.g. admin@medflow.com";

  return (
<<<<<<< HEAD
    <div style={{
      minHeight: "100vh", background: "#060b14",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 20,
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%)",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: "linear-gradient(135deg,#00d4ff,#0099bb)",
            borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 34, color: "#060b14", fontWeight: 700, margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(0,212,255,0.35)",
          }}>+</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 26, color: "#00d4ff", fontWeight: 700, letterSpacing: 1 }}>MedFlow v4.0</div>
          <div style={{ fontSize: 13, color: "#4a6a8a", marginTop: 4 }}>Complete Hospital Workflow Automation</div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(13,21,38,0.97)",
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: 24, padding: 36,
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: "#e2eaf5" }}>Staff Authentication</div>
          <div style={{ fontSize: 12, color: "#4a6a8a", marginBottom: 24 }}>
            Select your role to access your specialized dashboard.
          </div>

          {/* Role selector — 3x2 grid */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
                  padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${selectedRole === r.id ? r.color : "rgba(0,212,255,0.1)"}`,
                  background: selectedRole === r.id ? `${r.color}14` : "transparent",
                  textAlign: "center", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{r.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: selectedRole === r.id ? r.color : "#5a7aa0", fontFamily: "monospace", textTransform: "uppercase" }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 9, color: "#4a6a8a", marginTop: 1 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="professional@medflow.com"
                style={{
                  width: "100%", background: "#060b14", border: `1px solid ${email ? accentColor + "66" : "rgba(0,212,255,0.18)"}`,
                  borderRadius: 10, color: "#e2eaf5", fontSize: 14, padding: "12px 14px",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", background: "#060b14", border: `1px solid ${password ? accentColor + "66" : "rgba(0,212,255,0.18)"}`,
                  borderRadius: 10, color: "#e2eaf5", fontSize: 14, padding: "12px 14px",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                fontSize: 13, color: "#ef4444",
              }}>⚠️ {error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: "#060b14", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Space Mono', monospace", opacity: loading ? 0.7 : 1,
              boxShadow: `0 8px 24px ${accentColor}33`, transition: "all 0.2s",
            }}>
              {loading ? "Authenticating..." : "Sign In →"}
            </button>
          </form>

          {/* Quick Demo — 3x2 grid */}
          <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18 }}>
            <div style={{ fontSize: 10, color: "#4a6a8a", fontFamily: "monospace", textAlign: "center", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              ⚡ Quick Demo Access
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
              {DEMO_CREDS.map(c => (
                <button key={c.role} onClick={() => fillDemo(c)} style={{
                  padding: "9px 8px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${c.color}22`, background: `${c.color}08`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: c.color }}>{c.label}</div>
                  <div style={{ fontSize: 9, color: "#4a6a8a", fontFamily: "monospace" }}>{c.email.split("@")[0]}</div>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#4a6a8a", textAlign: "center", marginTop: 10 }}>
              All demo passwords shown in seed_demo.py
            </div>
          </div>
=======
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>+</div>
          <span style={S.logoText}>MedFlow</span>
        </div>

        {/* Toggle */}
        <div style={S.toggleRow}>
          <button style={S.toggleBtn(mode === "staff")} onClick={() => { setMode("staff"); setUsername(""); setPassword(""); setError(""); }}>
            👨‍⚕️ Staff Login
          </button>
          <button style={S.toggleBtn(mode === "patient")} onClick={() => { setMode("patient"); setUsername(""); setPassword(""); setError(""); }}>
            🏥 Patient Login
          </button>
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
        </div>

        <div style={S.title}>{mode === "patient" ? "Patient Portal" : "Staff Portal"}</div>
        <div style={S.sub}>{mode === "patient" ? "Enter your Patient ID to continue" : "Enter your credentials to continue"}</div>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={S.label}>{mode === "patient" ? "Patient ID" : "Email Address"}</label>
          <input
            style={S.input}
            placeholder={placeholderUser}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
          />
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            placeholder={mode === "patient" ? "Default: your Patient ID" : "Password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        {mode === "patient" ? (
          <div style={S.hint}>
            🔑 Your Patient ID was given to you at registration (e.g. PAT001).<br />
            Default password is your Patient ID. Contact admin to reset.
          </div>
        ) : (
          <div style={S.hint}>
            📋 <strong>Demo Logins:</strong><br />
            admin@medflow.com / admin123 &nbsp;|&nbsp; dr.sharma@medflow.com / doc123<br />
            lab@medflow.com / lab123 &nbsp;|&nbsp; pharmacy@medflow.com / pharmacy123<br />
            billing@medflow.com / billing123
          </div>
        )}
      </div>
    </div>
  );
}
