import React, { useState, useEffect } from "react";
import { getPatientReports } from "../api/labApi";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const SC = { PENDING: "#f59e0b", IN_PROGRESS: "#00d4ff", COMPLETED: "#22c55e" };
const SB = { PENDING: "rgba(245,158,11,0.12)", IN_PROGRESS: "rgba(0,212,255,0.12)", COMPLETED: "rgba(34,197,94,0.12)" };
const SI = { PENDING: "⏳", IN_PROGRESS: "🔬", COMPLETED: "✅" };

function Badge({ status }) {
  return (
    <span style={{
      padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: "monospace", color: SC[status] || "#888",
      background: SB[status] || "#222", border: `1px solid ${SC[status]}33`,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {SI[status]} {status?.replace("_", " ")}
    </span>
  );
}

export default function PatientDashboard({ onLogout }) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const patientCode = user?.patient_code || localStorage.getItem("patient_code");

  useEffect(() => {
    if (patientCode) {
      getPatientReports(patientCode)
        .then(r => setReports(r.data))
        .catch(() => { })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [patientCode]);

  const pending = reports.filter(r => r.status === "PENDING").length;
  const inProgress = reports.filter(r => r.status === "IN_PROGRESS").length;
  const completed = reports.filter(r => r.status === "COMPLETED").length;

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 28 }}>
        {/* Patient ID Hero Card */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(13,21,38,0.95) 100%)",
          border: "1px solid rgba(0,212,255,0.25)",
          borderRadius: 18, padding: 28, marginBottom: 24,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(0,212,255,0.05)", filter: "blur(30px)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                Patient Profile
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{user?.full_name}</div>
              <div style={{ fontSize: 13, color: "#5a7aa0" }}>{user?.email}</div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.2)" }}>
                  ✅ Active Patient
                </span>
                <span style={{ fontSize: 12, color: "#a855f7", background: "rgba(168,85,247,0.1)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(168,85,247,0.2)" }}>
                  🔒 Role: Patient
                </span>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Your Patient ID
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: 36, fontWeight: 700, color: "#00d4ff",
                background: "rgba(0,212,255,0.08)", padding: "14px 24px", borderRadius: 12,
                border: "2px solid rgba(0,212,255,0.3)",
                boxShadow: "0 0 30px rgba(0,212,255,0.15)",
                letterSpacing: 2,
              }}>
                {patientCode || "N/A"}
              </div>
              <div style={{ fontSize: 11, color: "#4a6a8a", marginTop: 8 }}>
                🏥 Show this ID at every department
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Pending Tests", value: pending, color: "#f59e0b", icon: "⏳" },
            { label: "In Progress", value: inProgress, color: "#00d4ff", icon: "🔬" },
            { label: "Completed Tests", value: completed, color: "#22c55e", icon: "✅" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#0d1526", border: "1px solid rgba(0,212,255,0.1)",
              borderRadius: 14, padding: "18px 20px", textAlign: "center", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: stat.color, opacity: 0.06 }} />
              <div style={{ fontSize: 28, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: stat.color, fontFamily: "monospace" }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "#5a7aa0", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Lab Reports */}
        <div style={{ background: "#0d1526", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{
            padding: "18px 24px", borderBottom: "1px solid rgba(0,212,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 2 }}>
              🧪 My Lab Reports
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#00d4ff", background: "rgba(0,212,255,0.1)", padding: "3px 10px", borderRadius: 20 }}>
              {reports.length} total
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: 60, color: "#5a7aa0" }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
              <div>Loading your reports...</div>
            </div>
          )}

          {!loading && reports.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#5a7aa0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#e2eaf5" }}>No Lab Reports Yet</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Visit the hospital and provide your Patient ID <strong style={{ color: "#00d4ff" }}>{patientCode}</strong><br />
                to the lab technician. Your reports will appear here automatically.
              </div>
            </div>
          )}

          {!loading && reports.length > 0 && (
            <div style={{ padding: 20 }}>
              {reports.map(r => (
                <div key={r.id}
                  onClick={() => setSelectedReport(selectedReport?.id === r.id ? null : r)}
                  style={{
                    border: `1px solid ${selectedReport?.id === r.id ? "rgba(0,212,255,0.35)" : "rgba(0,212,255,0.08)"}`,
                    borderRadius: 12, padding: 18, marginBottom: 12, cursor: "pointer",
                    background: selectedReport?.id === r.id ? "rgba(0,212,255,0.05)" : "transparent",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)"; }}
                  onMouseLeave={e => { if (selectedReport?.id !== r.id) e.currentTarget.style.borderColor = "rgba(0,212,255,0.08)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{
                          fontFamily: "monospace", fontSize: 12, color: "#00d4ff",
                          background: "rgba(0,212,255,0.1)", padding: "2px 10px", borderRadius: 6,
                        }}>{r.report_code}</span>
                        <Badge status={r.status} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{r.test_name}</div>
                      {r.notes && (
                        <div style={{ fontSize: 12, color: "#5a7aa0", marginBottom: 4 }}>
                          📝 {r.notes}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace" }}>
                        Uploaded: {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {r.file_name && ` · 📎 ${r.file_name}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                      {r.file_name && (
                        <a
                          href={`http://localhost:8000/api/lab-reports/${r.id}/download`}
                          target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: "linear-gradient(135deg,#00d4ff,#0099bb)",
                            color: "#060b14", textDecoration: "none",
                            fontFamily: "monospace", textAlign: "center",
                            boxShadow: "0 4px 12px rgba(0,212,255,0.2)",
                          }}>
                          📄 Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div style={{
          marginTop: 20, background: "rgba(0,212,255,0.04)",
          border: "1px solid rgba(0,212,255,0.12)", borderRadius: 14, padding: 18,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>ℹ️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#00d4ff", marginBottom: 4 }}>How your Patient ID works</div>
            <div style={{ fontSize: 12, color: "#5a7aa0", lineHeight: 1.7 }}>
              Your unique Patient ID <strong style={{ color: "#00d4ff" }}>{patientCode || "..."}</strong> is your identity across all hospital departments — Reception, Lab, Radiology, Pharmacy and more.
              Share it with the lab technician during your visit and your test reports will automatically appear here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
