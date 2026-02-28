import React from "react";

const ROLE_CONFIG = {
    LAB_TECHNICIAN: { label: "Lab Technician Portal", icon: "🧪", accent: "#a855f7" },
    PATIENT: { label: "Patient Portal", icon: "🏥", accent: "#00d4ff" },
    ADMIN: { label: "Admin Dashboard", icon: "⚙️", accent: "#00d4ff" },
    DOCTOR: { label: "Doctor Dashboard", icon: "👨‍⚕️", accent: "#22c55e" },
};

export default function Navbar({ user, onLogout }) {
    const role = user?.role || "PATIENT";
    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG["PATIENT"];

    return (
        <div style={{
            position: "sticky", top: 0, zIndex: 999,
            background: "rgba(10,16,32,0.98)",
            borderBottom: "1px solid rgba(0,212,255,0.15)",
            backdropFilter: "blur(20px)",
            height: 60,
            display: "flex", alignItems: "center",
            padding: "0 24px", gap: 16,
        }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 34, height: 34,
                    background: "linear-gradient(135deg,#00d4ff,#0099bb)",
                    borderRadius: 9,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, color: "#060b14", fontWeight: 700,
                    boxShadow: "0 0 16px rgba(0,212,255,0.3)",
                }}>+</div>
                <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: "#00d4ff", fontWeight: 700, lineHeight: 1 }}>
                        MedFlow
                    </div>
                    <div style={{ fontSize: 10, color: "#4a6a8a", marginTop: 2 }}>
                        {cfg.icon} {cfg.label}
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                    boxShadow: "0 0 6px #22c55e",
                    animation: "pulse 2s ease-in-out infinite",
                }} />
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#22c55e" }}>LIVE</span>
            </div>

            {/* User info */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)",
                borderRadius: 10, padding: "6px 12px",
            }}>
                <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${cfg.accent}, #0d1526)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: cfg.accent,
                    border: `1px solid ${cfg.accent}44`,
                }}>
                    {(user?.full_name || user?.name || "U")[0].toUpperCase()}
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2eaf5", lineHeight: 1.2 }}>
                        {user?.full_name || user?.name || "User"}
                    </div>
                    <div style={{ fontSize: 10, color: "#4a6a8a", fontFamily: "monospace" }}>
                        {role.replace("_", " ")}
                    </div>
                </div>
            </div>

            {/* LOGOUT BUTTON */}
            <button
                id="logout-btn"
                onClick={onLogout}
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 18px", borderRadius: 9,
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#ef4444",
                    fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                    transition: "all 0.2s",
                    flexShrink: 0,
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.28)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.7)";
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                }}
            >
                <span>🚪</span>
                <span>Logout</span>
            </button>
        </div>
    );
}
