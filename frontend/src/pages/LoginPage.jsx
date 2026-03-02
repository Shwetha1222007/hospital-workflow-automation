import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

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
