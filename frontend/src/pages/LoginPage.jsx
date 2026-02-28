import React, { useState } from "react";
import { login } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { id: "SUPER_ADMIN", label: "Super Admin", icon: "⚙️", color: "#00d4ff", desc: "System control" },
  { id: "DOCTOR", label: "Doctor", icon: "👨‍⚕️", color: "#22c55e", desc: "Diagnosis & Notes" },
  { id: "NURSE", label: "Nurse", icon: "👩‍⚕️", color: "#f59e0b", desc: "Status & Care" },
  { id: "LAB_TECHNICIAN", label: "Lab Technician", icon: "🧪", color: "#a855f7", desc: "Test Reports" },
];

const DEMO_CREDS = [
  { role: "SUPER_ADMIN", email: "admin@medflow.com", password: "admin123", color: "#00d4ff" },
  { role: "DOCTOR", email: "dr.sharma@medflow.com", password: "doc123", color: "#22c55e" },
  { role: "NURSE", email: "nurse.priya@medflow.com", password: "nurse123", color: "#f59e0b" },
  { role: "LAB_TECHNICIAN", email: "lab@medflow.com", password: "lab123", color: "#a855f7" },
];

export default function LoginPage({ onLogin }) {
  const { loginUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState("SUPER_ADMIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fillDemo = (cred) => {
    setSelectedRole(cred.role);
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    setLoading(true); setError("");
    try {
      const data = await loginUser(email, password);
      onLogin(data.role);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  const accentColor = ROLES.find(r => r.id === selectedRole)?.color || "#00d4ff";

  return (
    <div style={{
      minHeight: "100vh", background: "#060b14",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 20,
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.06) 0%, transparent 50%)",
    }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, background: "linear-gradient(135deg,#00d4ff,#0099bb)",
            borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, color: "#060b14", fontWeight: 700, margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(0,212,255,0.3)",
          }}>+</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 24, color: "#00d4ff", fontWeight: 700, letterSpacing: 1 }}>MedFlow v3.0</div>
          <div style={{ fontSize: 13, color: "#4a6a8a", marginTop: 4 }}>Role-Based Hospital Automation</div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(13,21,38,0.95)",
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: 24, padding: 36,
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#e2eaf5" }}>Staff Authentication</div>
          <div style={{ fontSize: 13, color: "#4a6a8a", marginBottom: 26 }}>
            Select your professional role to access your specialized dashboard.
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{
                  padding: "12px 8px", borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${selectedRole === r.id ? r.color : "rgba(0,212,255,0.1)"}`,
                  background: selectedRole === r.id ? `${r.color}14` : "transparent",
                  textAlign: "center", transition: "all 0.2s",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{r.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: selectedRole === r.id ? r.color : "#5a7aa0", fontFamily: "monospace", textTransform: "uppercase" }}>{r.label.split(" ")[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="professional@medflow.com"
                style={{
                  width: "100%", background: "#060b14", border: `1px solid ${email ? accentColor + "66" : "rgba(0,212,255,0.18)"}`,
                  borderRadius: 10, color: "#e2eaf5", fontSize: 14, padding: "12px 14px",
                  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", background: "#060b14", border: `1px solid ${password ? accentColor + "66" : "rgba(0,212,255,0.18)"}`,
                  borderRadius: 10, color: "#e2eaf5", fontSize: 14, padding: "12px 14px",
                  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                fontSize: 13, color: "#ef4444",
              }}>⚠️ {error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
              color: "#060b14", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Space Mono', monospace", opacity: loading ? 0.7 : 1,
              boxShadow: `0 8px 24px ${accentColor}33`,
              transition: "all 0.2s",
            }}>
              {loading ? "Authenticating..." : `Sign In`}
            </button>
          </form>

          {/* Quick Demo */}
          <div style={{ marginTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
            <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textAlign: "center", marginBottom: 14 }}>DEMO ACCESS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {DEMO_CREDS.map(c => (
                <button key={c.role} onClick={() => fillDemo(c)} style={{
                  padding: "10px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${c.color}22`,
                  background: `${c.color}08`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.color, textAlign: "left" }}>{c.role.split("_")[0]}</div>
                  <div style={{ fontSize: 10, color: "#4a6a8a", fontFamily: "monospace" }}>{c.email.split("@")[0]}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
