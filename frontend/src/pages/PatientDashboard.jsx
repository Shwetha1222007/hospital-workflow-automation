import React, { useState, useEffect } from "react";
import axios from "axios";
import { API, useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const token = () => localStorage.getItem("token");
const hdr = () => ({ Authorization: `Bearer ${token()}` });

const STAGE_CONFIG = {
  REGISTRATION: { icon: "📋", label: "Registration", color: "#00d4ff" },
  DOCTOR: { icon: "👨‍⚕️", label: "Doctor Visit", color: "#22c55e" },
  NURSE_CARE: { icon: "👩‍⚕️", label: "Nurse Care", color: "#f59e0b" },
  LAB: { icon: "🧪", label: "Lab Tests", color: "#a855f7" },
  PHARMACY: { icon: "💊", label: "Pharmacy", color: "#f97316" },
  BILLING: { icon: "💳", label: "Billing", color: "#ec4899" },
  DISCHARGE: { icon: "🚪", label: "Discharge", color: "#22c55e" },
};

const STATUS_CONFIG = {
  CREATED: { color: "#64748b", label: "Created" },
  ASSIGNED: { color: "#00d4ff", label: "Assigned" },
  PENDING: { color: "#f59e0b", label: "Pending" },
  IN_PROGRESS: { color: "#f59e0b", label: "In Progress" },
  COMPLETED: { color: "#22c55e", label: "Completed" },
};

function WorkflowTimeline({ logs }) {
  if (!logs || logs.length === 0) return (
    <div style={{ textAlign: "center", padding: 40, color: "#5a7aa0" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
      <div>No workflow events yet</div>
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Vertical line */}
      <div style={{
        position: "absolute", left: 24, top: 0, bottom: 0, width: 2,
        background: "linear-gradient(to bottom, #00d4ff33, #1e2d4a)",
      }} />

      {logs.map((log, i) => {
        const stage = STAGE_CONFIG[log.stage] || { icon: "⚙️", label: log.stage, color: "#64748b" };
        const status = STATUS_CONFIG[log.status] || { color: "#64748b", label: log.status };
        const isLast = i === logs.length - 1;

        return (
          <div key={log.id} style={{ display: "flex", gap: 20, marginBottom: 24, position: "relative" }}>
            {/* Dot */}
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: status.status === "COMPLETED" ? `${stage.color}22` : "#0d1526",
              border: `2px solid ${status.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, zIndex: 1, position: "relative",
              boxShadow: isLast ? `0 0 20px ${stage.color}44` : "none",
            }}>
              {log.status === "COMPLETED" ? "✅" : stage.icon}
            </div>

            {/* Content */}
            <div style={{
              flex: 1, background: "#0d1526", border: `1px solid ${isLast ? stage.color + "44" : "#1e2d4a"}`,
              borderRadius: 14, padding: "16px 20px",
              boxShadow: isLast ? `0 4px 20px ${stage.color}18` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                      background: `${status.color}18`, color: status.color, border: `1px solid ${status.color}44`,
                      fontFamily: "monospace",
                    }}>
                      {status.label}
                    </span>
                    {log.is_late && (
                      <span style={{ fontSize: 10, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 20, padding: "2px 9px", fontFamily: "monospace", fontWeight: 700 }}>
                        ⚠️ LATE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#a0b8d0" }}>{log.notes}</div>
                  {log.updator_name && (
                    <div style={{ fontSize: 11, color: "#4a6a8a", marginTop: 4, fontFamily: "monospace" }}>
                      by {log.updator_name}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textAlign: "right", flexShrink: 0 }}>
                  {new Date(log.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}<br />
                  {new Date(log.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PatientDashboard({ onLogout }) {
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [workflow, setWorkflow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");

  const patientCode = user?.patient_code || localStorage.getItem("patient_code");

  useEffect(() => {
    if (!patientCode) { setLoading(false); return; }
    const load = async () => {
      try {
        const [pRes, wfRes, labRes] = await Promise.all([
          axios.get(`${API}/patients/${patientCode}`, { headers: hdr() }),
          axios.get(`${API}/patients/${patientCode}/workflow`, { headers: hdr() }),
          axios.get(`${API}/lab-reports/`, { headers: hdr() }).catch(() => ({ data: [] })),
        ]);
        setPatient(pRes.data);
        setWorkflow(wfRes.data);
        setReports(labRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [patientCode]);

  const isCompleted = (stage) => workflow.some(l => l.stage === stage && l.status === "COMPLETED");
  const isDischarged = patient?.status === "DISCHARGED";

  const TABS = [
    { id: "timeline", label: "⏱ Workflow Timeline", count: workflow.length },
    { id: "reports", label: "🧪 Lab Reports", count: reports.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "#00d4ff" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div style={{ fontFamily: "monospace" }}>Loading your health journey...</div>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(13,21,38,0.97))",
              border: "1px solid rgba(0,212,255,0.25)", borderRadius: 20, padding: 28, marginBottom: 24,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(0,212,255,0.04)", filter: "blur(40px)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
                    Patient Profile
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{user?.full_name}</div>
                  <div style={{ fontSize: 13, color: "#5a7aa0", marginBottom: 10 }}>{user?.email}</div>

                  {/* Journey progress chips */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {isDischarged ? (
                      <span style={{ fontSize: 12, color: "#22c55e", background: "rgba(34,197,94,0.12)", padding: "4px 14px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.3)", fontWeight: 700 }}>
                        ✅ Treatment Complete — Discharged
                      </span>
                    ) : (
                      <>
                        {isCompleted("REGISTRATION") && <span style={{ fontSize: 11, color: "#00d4ff", background: "rgba(0,212,255,0.08)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(0,212,255,0.2)" }}>✓ Registered</span>}
                        {isCompleted("DOCTOR") && <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.2)" }}>✓ Doctor Visited</span>}
                        {isCompleted("LAB") && <span style={{ fontSize: 11, color: "#a855f7", background: "rgba(168,85,247,0.08)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(168,85,247,0.2)" }}>✓ Lab Done</span>}
                        {isCompleted("PHARMACY") && <span style={{ fontSize: 11, color: "#f97316", background: "rgba(249,115,22,0.08)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(249,115,22,0.2)" }}>✓ Medication</span>}
                        {isCompleted("BILLING") && <span style={{ fontSize: 11, color: "#ec4899", background: "rgba(236,72,153,0.08)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(236,72,153,0.2)" }}>✓ Bill Paid</span>}
                      </>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Patient ID
                  </div>
                  <div style={{
                    fontFamily: "monospace", fontSize: 36, fontWeight: 700, color: "#00d4ff",
                    background: "rgba(0,212,255,0.08)", padding: "14px 24px", borderRadius: 14,
                    border: "2px solid rgba(0,212,255,0.3)", boxShadow: "0 0 30px rgba(0,212,255,0.15)",
                    letterSpacing: 2,
                  }}>
                    {patientCode || "N/A"}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a6a8a", marginTop: 8 }}>Show at every department</div>
                </div>
              </div>
            </div>

            {/* Patient details */}
            {patient && (
              <div style={{
                background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 14, padding: "16px 22px",
                marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
              }}>
                {[
                  { label: "Complaint", value: patient.complaint, icon: "🤒" },
                  { label: "Doctor", value: patient.doctor_name || "—", icon: "👨‍⚕️" },
                  { label: "Nurse", value: patient.nurse_name || "—", icon: "👩‍⚕️" },
                  { label: "Status", value: patient.status?.replace(/_/g, " "), icon: "📊" },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2eaf5" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: activeTab === t.id ? "rgba(0,212,255,0.12)" : "#0d1526",
                  border: `1px solid ${activeTab === t.id ? "rgba(0,212,255,0.4)" : "#1e2d4a"}`,
                  color: activeTab === t.id ? "#00d4ff" : "#5a7aa0", transition: "all 0.2s",
                }}>
                  {t.label}
                  <span style={{
                    marginLeft: 8, fontSize: 11, padding: "2px 7px", borderRadius: 12,
                    background: activeTab === t.id ? "rgba(0,212,255,0.2)" : "#1e2d4a", color: "#e2eaf5",
                  }}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Timeline Tab */}
            {activeTab === "timeline" && (
              <div style={{ background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 24, color: "#00d4ff" }}>
                  🏥 Your Hospital Journey
                </div>
                <WorkflowTimeline logs={workflow} />

                {isDischarged && (
                  <div style={{
                    marginTop: 28, background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(0,212,255,0.05))",
                    border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, padding: 24, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", marginBottom: 8 }}>
                      Treatment Complete!
                    </div>
                    <div style={{ color: "#5a7aa0", fontSize: 14 }}>
                      You have been successfully discharged. Wishing you a speedy recovery!
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lab Reports Tab */}
            {activeTab === "reports" && (
              <div style={{ background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e2d4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 2 }}>
                    🧪 Lab Reports
                  </div>
                  <span style={{ fontSize: 12, color: "#00d4ff", background: "rgba(0,212,255,0.1)", padding: "3px 12px", borderRadius: 20 }}>
                    {reports.length} total
                  </span>
                </div>

                {reports.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#e2eaf5", marginBottom: 8 }}>No Lab Reports Yet</div>
                    <div style={{ fontSize: 13 }}>Reports will appear here once the lab technician uploads them.</div>
                  </div>
                ) : (
                  <div style={{ padding: 20 }}>
                    {reports.map(r => (
                      <div key={r.id} style={{
                        border: "1px solid #1e2d4a", borderRadius: 12, padding: 18, marginBottom: 12,
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                        transition: "all 0.2s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(168,85,247,0.35)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2d4a"}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#a855f7", background: "rgba(168,85,247,0.1)", padding: "2px 10px", borderRadius: 6 }}>
                              {r.report_code}
                            </span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontFamily: "monospace",
                              color: r.status === "COMPLETED" ? "#22c55e" : "#f59e0b",
                              background: r.status === "COMPLETED" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                              border: `1px solid ${r.status === "COMPLETED" ? "#22c55e44" : "#f59e0b44"}`,
                            }}>
                              {r.status === "COMPLETED" ? "✅ " : "⏳ "}{r.status.replace("_", " ")}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{r.test_type}</div>
                          {r.notes && <div style={{ fontSize: 12, color: "#5a7aa0" }}>📝 {r.notes}</div>}
                          <div style={{ fontSize: 11, color: "#4a6a8a", fontFamily: "monospace", marginTop: 4 }}>
                            {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        {r.file_path && r.status === "COMPLETED" && (
                          <a
                            href={`${API.replace("/api", "")}/api/lab-reports/${r.id}/download`}
                            target="_blank" rel="noreferrer"
                            style={{
                              padding: "10px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                              background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                              color: "#fff", textDecoration: "none", flexShrink: 0,
                              display: "flex", alignItems: "center", gap: 6,
                              boxShadow: "0 4px 14px rgba(168,85,247,0.25)",
                            }}
                          >
                            📄 View / Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
