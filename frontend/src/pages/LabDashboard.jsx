import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const token = () => localStorage.getItem("token");
const hdr = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_COLOR = { PENDING: "#f59e0b", IN_PROGRESS: "#00d4ff", COMPLETED: "#22c55e" };
const STATUS_BG = { PENDING: "rgba(245,158,11,0.12)", IN_PROGRESS: "rgba(0,212,255,0.12)", COMPLETED: "rgba(34,197,94,0.12)" };
const STATUS_ICON = { PENDING: "⏳", IN_PROGRESS: "🔬", COMPLETED: "✅" };

function Badge({ status }) {
  return (
    <span style={{
      padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "monospace",
      color: STATUS_COLOR[status] || "#888", background: STATUS_BG[status] || "#222",
      border: `1px solid ${STATUS_COLOR[status] || "#888"}33`,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {STATUS_ICON[status]} {status?.replace("_", " ")}
    </span>
  );
}

function Toast({ msg, isError, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: isError ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
      border: `1px solid ${isError ? "#ef444455" : "#22c55e55"}`,
      borderRadius: 12, padding: "14px 22px",
      color: isError ? "#ef4444" : "#22c55e",
      fontWeight: 600, fontSize: 13, backdropFilter: "blur(20px)",
    }}>
      {msg}
    </div>
  );
}

const TABS = [
  { id: "patients", label: "Patient Queue", icon: "👥" },
  { id: "upload", label: "Upload Report", icon: "📤" },
  { id: "reports", label: "All My Reports", icon: "📋" },
];

export default function LabDashboard({ onLogout }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("patients");
  const [allReports, setAllReports] = useState([]);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Upload tab
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadAllReports(); }, []);

  const loadAllReports = async () => {
    try {
      const r = await axios.get(`${API}/lab-reports/`, { headers: hdr() });
      setAllReports(r.data);
    } catch { }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchLoading(true);
    try {
      const r = await axios.get(`${API}/patients/search?q=${encodeURIComponent(search.trim())}`, { headers: hdr() });
      setPatients(r.data);
      if (r.data.length === 0) showToast("No patients found", true);
    } catch { showToast("Search failed", true); }
    finally { setSearchLoading(false); }
  };

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    setSelectedReport(null);
    setPatientReports([]);
    try {
      // Get their assigned lab reports
      const r = await axios.get(`${API}/lab-reports/`, { headers: hdr() });
      const pt_reports = r.data.filter(rep => rep.patient_id === p.id);
      setPatientReports(pt_reports);
      if (pt_reports.length > 0) setSelectedReport(pt_reports[0]);
    } catch { }
  };

  const handleUpload = async () => {
    if (!selectedReport) { showToast("Select a lab test report to upload for", true); return; }
    if (!file) { showToast("Please choose a file to upload", true); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      if (notes) fd.append("notes", notes);
      fd.append("file", file);
      await axios.post(`${API}/lab-reports/${selectedReport.id}/upload`, fd, {
        headers: { ...hdr(), "Content-Type": "multipart/form-data" },
      });
      showToast(`✅ Report uploaded for ${selectedPatient.name}!`);
      setFile(null); setNotes("");
      loadAllReports();
      await selectPatient(selectedPatient);
    } catch (e) {
      showToast(e.response?.data?.detail || "Upload failed. Check file type (JPG/PNG/PDF).", true);
    } finally { setUploading(false); }
  };

  const showToast = (msg, isError = false) => setToast({ msg, isError });

  const filteredReports = filterStatus === "ALL" ? allReports : allReports.filter(r => r.status === filterStatus);

  // Group reports by patient for the "patients" tab, priority-sorted
  const patientGroups = (() => {
    const map = {};
    allReports.forEach(r => {
      if (!map[r.patient_id]) {
        map[r.patient_id] = {
          patient_id: r.patient_id,
          patient_code: r.patient_code || `#${r.patient_id}`,
          patient_name: r.patient_name || "—",
          priority: r.patient_priority || "NORMAL",
          reports: [],
        };
      }
      map[r.patient_id].reports.push(r);
    });
    return Object.values(map).sort((a, b) => {
      if (a.priority === "EMERGENCY" && b.priority !== "EMERGENCY") return -1;
      if (b.priority === "EMERGENCY" && a.priority !== "EMERGENCY") return 1;
      const pendA = a.reports.filter(r => r.status !== "COMPLETED").length;
      const pendB = b.reports.filter(r => r.status !== "COMPLETED").length;
      return pendB - pendA;
    });
  })();

  const s = {
    card: { background: "#0d1526", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 14, padding: 22, marginBottom: 16 },
    input: {
      width: "100%", background: "#060b14", border: "1px solid rgba(0,212,255,0.2)",
      borderRadius: 9, color: "#e2eaf5", fontSize: 13, padding: "10px 13px", outline: "none", boxSizing: "border-box",
    },
    label: { display: "block", fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "monospace" },
    btn: {
      padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
      background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff",
      border: "none", fontFamily: "monospace", boxShadow: "0 4px 16px rgba(168,85,247,0.25)",
    },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 28 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#a855f7", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, fontWeight: 700, fontFamily: "monospace" }}>
            Lab Technician
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800 }}>Laboratory Portal 🧪</h1>
          <div style={{ color: "#5a7aa0", fontSize: 14 }}>{allReports.length} total reports · {allReports.filter(r => r.status === "PENDING").length} pending</div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Reports", value: allReports.length, color: "#a855f7", icon: "📋" },
            { label: "Pending", value: allReports.filter(r => r.status === "PENDING").length, color: "#f59e0b", icon: "⏳" },
            { label: "In Progress", value: allReports.filter(r => r.status === "IN_PROGRESS").length, color: "#00d4ff", icon: "🔬" },
            { label: "Completed", value: allReports.filter(r => r.status === "COMPLETED").length, color: "#22c55e", icon: "✅" },
          ].map(stat => (
            <div key={stat.label} style={{ ...s.card, marginBottom: 0, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: stat.color, fontFamily: "monospace" }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "#5a7aa0", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "monospace",
              background: tab === t.id ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "#0d1526",
              color: tab === t.id ? "#fff" : "#5a7aa0",
              border: "1px solid " + (tab === t.id ? "#a855f7" : "rgba(0,212,255,0.12)"),
              boxShadow: tab === t.id ? "0 4px 16px rgba(168,85,247,0.2)" : "none",
              transition: "all 0.2s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── PATIENT QUEUE TAB ── */}
        {tab === "patients" && (
          <div>
            {patientGroups.length === 0 ? (
              <div style={{ ...s.card, textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🧪</div>
                <div>No lab tests assigned yet</div>
              </div>
            ) : (
              patientGroups.map(pg => {
                const pending = pg.reports.filter(r => r.status !== "COMPLETED").length;
                const completed = pg.reports.filter(r => r.status === "COMPLETED").length;
                return (
                  <div key={pg.patient_id} style={{
                    ...s.card,
                    borderColor: pg.priority === "EMERGENCY" ? "rgba(239,68,68,0.4)" : "rgba(0,212,255,0.1)",
                    boxShadow: pg.priority === "EMERGENCY" ? "0 0 24px rgba(239,68,68,0.1)" : "none",
                  }}>
                    {/* Patient header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontFamily: "monospace", color: "#a855f7", fontWeight: 700, fontSize: 14 }}>{pg.patient_code}</span>
                        <span style={{ fontSize: 17, fontWeight: 700 }}>{pg.patient_name}</span>
                        {pg.priority === "EMERGENCY" && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6, color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
                            🚨 EMERGENCY
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#5a7aa0" }}>
                        <span>🧪 {pg.reports.length} tests</span>
                        <span style={{ color: "#f59e0b" }}>⏳ {pending} pending</span>
                        <span style={{ color: "#22c55e" }}>✅ {completed} done</span>
                      </div>
                    </div>

                    {/* Test list */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                      {pg.reports.map(r => (
                        <div key={r.id} style={{
                          background: "#060b14", border: `1px solid ${r.status === "COMPLETED" ? "#22c55e33" : "rgba(0,212,255,0.08)"}`,
                          borderRadius: 10, padding: "12px 16px",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.test_type}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a855f7", marginTop: 2 }}>{r.report_code}</div>
                            {r.notes && <div style={{ fontSize: 11, color: "#5a7aa0", marginTop: 2 }}>📝 {r.notes}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            <Badge status={r.status} />
                            {r.status !== "COMPLETED" && (
                              <button onClick={() => { setTab("upload"); setSelectedPatient(pg); setSelectedReport(r); setPatientReports(pg.reports); }} style={{
                                padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                                background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)",
                                color: "#a855f7", cursor: "pointer",
                              }}>
                                📤 Upload
                              </button>
                            )}
                            {r.file_path && (
                              <a href={`http://localhost:8000/api/lab-reports/${r.id}/download`}
                                target="_blank" rel="noreferrer"
                                style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", textDecoration: "none" }}>
                                👁 View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Patient search */}
            <div style={s.card}>
              <div style={s.label}>🔍 Search Patient</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input style={{ ...s.input, flex: 1 }} placeholder="PAT001 or patient name..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
                <button onClick={handleSearch} disabled={searchLoading} style={{ ...s.btn, opacity: searchLoading ? 0.7 : 1 }}>
                  {searchLoading ? "..." : "Search"}
                </button>
              </div>

              {patients.map(p => (
                <div key={p.id} onClick={() => selectPatient(p)} style={{
                  padding: "13px 16px", borderRadius: 10, marginBottom: 8, cursor: "pointer",
                  border: "1px solid " + (selectedPatient?.id === p.id ? "#a855f7" : "rgba(0,212,255,0.1)"),
                  background: selectedPatient?.id === p.id ? "rgba(168,85,247,0.07)" : "transparent",
                  transition: "all 0.18s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: "#a855f7", background: "rgba(168,85,247,0.1)", padding: "2px 10px", borderRadius: 6 }}>{p.patient_code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#5a7aa0" }}>{p.age}y · {p.gender} · {p.complaint}</div>
                </div>
              ))}

              {/* Show selected patient's test list */}
              {selectedPatient && patientReports.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={s.label}>Select Test to Upload Report For</div>
                  {patientReports.map(r => (
                    <div key={r.id} onClick={() => setSelectedReport(r)} style={{
                      padding: "10px 14px", borderRadius: 9, marginBottom: 8, cursor: "pointer",
                      border: "1px solid " + (selectedReport?.id === r.id ? "#a855f7" : "rgba(0,212,255,0.08)"),
                      background: selectedReport?.id === r.id ? "rgba(168,85,247,0.08)" : "transparent",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.test_type}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a855f7" }}>{r.report_code}</div>
                      </div>
                      <Badge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload form */}
            <div style={s.card}>
              <div style={s.label}>📤 Upload Lab Report</div>

              {selectedPatient && selectedReport ? (
                <div style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                  <div style={{ fontWeight: 600 }}>{selectedPatient.name} — {selectedReport.test_type}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#a855f7" }}>{selectedPatient.patient_code} · {selectedReport.report_code}</div>
                </div>
              ) : (
                <div style={{ background: "#111d35", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#4a6a8a", textAlign: "center" }}>
                  ← Search patient & select test
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>File * (PDF, JPG, PNG)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setFile(e.target.files[0])}
                  style={{ ...s.input, padding: "8px 12px", cursor: "pointer" }}
                />
                {file && (
                  <div style={{ fontSize: 12, color: "#22c55e", marginTop: 6 }}>
                    ✅ {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Notes (Optional)</label>
                <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }}
                  placeholder="Lab findings or notes..." value={notes} onChange={e => setNotes(e.target.value)}
                />
              </div>

              <button onClick={handleUpload} disabled={uploading || !selectedReport} style={{
                ...s.btn, width: "100%", opacity: uploading || !selectedReport ? 0.5 : 1, cursor: uploading || !selectedReport ? "not-allowed" : "pointer",
              }}>
                {uploading ? "⏳ Uploading..." : "📤 Upload Report"}
              </button>
            </div>
          </div>
        )}

        {/* ── ALL REPORTS TAB ── */}
        {tab === "reports" && (
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div style={s.label}>My Lab Reports ({filteredReports.length})</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(f => (
                  <button key={f} onClick={() => setFilterStatus(f)} style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace",
                    background: filterStatus === f ? (STATUS_BG[f] || "rgba(168,85,247,0.12)") : "transparent",
                    color: filterStatus === f ? (STATUS_COLOR[f] || "#a855f7") : "#4a6a8a",
                    border: "1px solid " + (filterStatus === f ? (STATUS_COLOR[f] || "#a855f7") + "55" : "rgba(0,212,255,0.1)"),
                  }}>{f.replace("_", " ")}</button>
                ))}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: 50, color: "#5a7aa0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <div>No reports found</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Code", "Patient", "Test", "Status", "File", "Date"].map(h => (
                      <th key={h} style={{ fontSize: 10, fontFamily: "monospace", color: "#4a6a8a", textTransform: "uppercase", letterSpacing: 1, padding: "10px 14px", borderBottom: "1px solid rgba(0,212,255,0.08)", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: "#a855f7" }}>{r.report_code}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{r.patient_name || "—"}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#5a7aa0" }}>{r.patient_code || `#${r.patient_id}`}</div>
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 13 }}>{r.test_type}</td>
                      <td style={{ padding: "11px 14px" }}><Badge status={r.status} /></td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#5a7aa0" }}>
                        {r.file_path ? (
                          <a href={`http://localhost:8000/api/lab-reports/${r.id}/download`} target="_blank" rel="noreferrer"
                            style={{ color: "#22c55e", textDecoration: "none", fontWeight: 700 }}>
                            📄 View
                          </a>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 11, color: "#5a7aa0", fontFamily: "monospace" }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
