import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a0f1e 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 20,
    backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%)",
  },
  card: {
    background: "rgba(13,21,38,0.95)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(0,212,255,0.15)",
    borderRadius: 24, padding: "48px 44px", width: "100%", maxWidth: 440,
    boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.05)",
  },
  logo: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 32,
    justifyContent: "center",
  },
  logoIcon: {
    width: 52, height: 52,
    background: "linear-gradient(135deg,#00d4ff,#0077ff)",
    borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 28, color: "#fff", fontWeight: 900,
    boxShadow: "0 0 24px rgba(0,212,255,0.35)",
  },
  logoText: { color: "#fff", fontSize: 24, fontWeight: 700, letterSpacing: -0.5 },
  toggleRow: {
    display: "flex", background: "rgba(255,255,255,0.05)",
    borderRadius: 12, padding: 4, marginBottom: 28, gap: 4,
  },
  toggleBtn: (active) => ({
    flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: 13, transition: "all 0.2s",
    background: active ? "linear-gradient(135deg,#00d4ff,#0077ff)" : "transparent",
    color: active ? "#0a0f1e" : "rgba(255,255,255,0.4)",
    boxShadow: active ? "0 4px 16px rgba(0,212,255,0.3)" : "none",
  }),
  title: { color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 6, textAlign: "center" },
  sub: { color: "rgba(0,212,255,0.45)", fontSize: 13, marginBottom: 28, textAlign: "center", fontWeight: 500, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, marginBottom: 6, display: "block", letterSpacing: 1, textTransform: "uppercase" },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(0,212,255,0.18)",
    background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 14,
    outline: "none", boxSizing: "border-box", marginBottom: 18,
    transition: "all 0.2s",
  },
  btn: {
    width: "100%", padding: "14px 0",
    background: "linear-gradient(135deg,#00d4ff,#0077ff)",
    border: "none", borderRadius: 12, color: "#0a0f1e",
    fontWeight: 800, fontSize: 15, cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,212,255,0.35)",
    transition: "all 0.15s",
    marginTop: 4,
  },
  error: {
    background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: 10, padding: "10px 14px", color: "#ff6b6b",
    fontSize: 13, marginBottom: 16, textAlign: "center",
  },
  hint: {
    marginTop: 24, padding: "14px",
    background: "rgba(0,212,255,0.04)", borderRadius: 12,
    border: "1px solid rgba(0,212,255,0.1)",
    color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.6,
  },
};

const DEMOS = [
  { label: "Admin", email: "admin@medflow.com", pass: "admin123" },
  { label: "Doctor", email: "dr.sharma@medflow.com", pass: "doc123" },
  { label: "Lab", email: "lab@medflow.com", pass: "lab123" },
];

export default function LoginPage({ onLogin }) {
  const { loginUser } = useAuth();
  const [mode, setMode] = useState("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(""); setLoading(true);
    try {
      const data = await loginUser(username.trim(), password);
      onLogin(data.role);
    } catch (err) {
      setError(err?.response?.data?.detail || "Authentication Failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (d) => {
    setUsername(d.email);
    setPassword(d.pass);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>+</div>
          <span style={S.logoText}>MedFlow v5.0</span>
        </div>

        {/* Toggle */}
        <div style={S.toggleRow}>
          <button style={S.toggleBtn(mode === "staff")} onClick={() => { setMode("staff"); setUsername(""); setPassword(""); setError(""); }}>
            👨‍⚕️ System Staff
          </button>
          <button style={S.toggleBtn(mode === "patient")} onClick={() => { setMode("patient"); setUsername(""); setPassword(""); setError(""); }}>
            🏥 Patient Portal
          </button>
        </div>

        <div style={S.title}>{mode === "patient" ? "Patient Access" : "Staff Authentication"}</div>
        <div style={S.sub}>{mode === "patient" ? "HOSPITAL CASE TRACKING" : "RESTRICTED ACCESS ONLY"}</div>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={S.label}>{mode === "patient" ? "Patient ID" : "Professional Email"}</label>
          <input
            style={S.input}
            placeholder={mode === "patient" ? "e.g. PAT001" : "e.g. name@medflow.com"}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <label style={S.label}>Secret Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? "AUTHENTICATING..." : "VERIFY & SIGN IN →"}
          </button>
        </form>

        {mode === "staff" ? (
          <div style={S.hint}>
            <div style={{ color: "#00d4ff", fontWeight: 700, marginBottom: 8, fontSize: 10, letterSpacing: 1 }}>AUTO-FILL DEMO:</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DEMOS.map(d => (
                <button key={d.label} onClick={() => fillDemo(d)} style={{ padding: "4px 8px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 6, color: "#00d4ff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={S.hint}>
            🔑 Use the Patient ID assigned during registration.<br />
            Don't have an ID? Visit the reception triage desk.
          </div>
        )}
      </div>
    </div>
  );
}
