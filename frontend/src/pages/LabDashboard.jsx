import React, { useState, useEffect } from "react";
import { getAllReports, getPatientReports, updateLabStatus, uploadExistingReportFile, uploadLabReport } from "../api/labApi";
import { searchPatients } from "../api/patientsApi";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

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

const TABS = [
  { id: "patients", label: "Patient Queue", icon: "👥" },
  { id: "upload", label: "Upload New Report", icon: "📤" },
  { id: "all", label: "All Reports Audit", icon: "📋" },
];

export default function LabDashboard({ onLogout }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("patients");
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search & Upload
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // Status updating
  const [isEditing, setIsEditing] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAllReports();
      setAllReports(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePatientSearch = async () => {
    if (!search.trim()) return;
    try {
      const res = await searchPatients(search.trim());
      setPatients(res.data);
    } catch { showToast("Patient search failed", true); }
  };

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    setSelectedReport(null);
    try {
      const reports = allReports.filter(r => r.patient_id === p.id);
      setPatientReports(reports);
      if (reports.length > 0) setSelectedReport(reports[0]);
    } catch { }
  };

  const handleFinalUpload = async () => {
    if (!selectedReport) return showToast("Select report request", true);
    if (!uploadFile) return showToast("File required", true);

    setUploading(true);
    try {
      const fd = new FormData();
      if (uploadNotes) fd.append("notes", uploadNotes);
      fd.append("file", uploadFile);
      await uploadExistingReportFile(selectedReport.id, fd);
      showToast("✅ Report uploaded and status COMPLETED!");
      setUploadFile(null); setUploadNotes(""); loadData();
    } catch { showToast("Upload failed", true); }
    finally { setUploading(false); }
  };

  const updateStatusDirect = async (reportId, status) => {
    try {
      await updateLabStatus(reportId, status, "Updating to " + status);
      showToast(`✅ Status updated to ${status}`);
      loadData();
    } catch { showToast("Update failed", true); }
  };

  // Grouped patients view
  const patientGroups = (() => {
    const map = {};
    allReports.forEach(r => {
      const pId = r.patient_id;
      if (!map[pId]) {
        map[pId] = {
          id: pId,
          code: r.patient_code || `P-${pId}`,
          name: r.patient_name || "Unknown",
          priority: r.patient_priority || "NORMAL",
          reports: []
        };
      }
      map[pId].reports.push(r);
    });
    return Object.values(map).sort((a, b) => (a.priority === "EMERGENCY" ? -1 : 1));
  })();

  const s = {
    card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, marginBottom: 16 },
    input: { background: "#060b14", border: "1px solid #1e2d4a", padding: 12, borderRadius: 8, color: "#fff", outline: "none", width: "100%", fontSize: 13 },
    btn: { background: "#00d4ff", border: "none", padding: "10px 20px", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 },
    label: { fontSize: 11, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6, fontWeight: 700 }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'Inter', sans-serif" }}>
      <Navbar user={{ full_name: user?.name || "Lab Tech", role: "LAB_TECHNICIAN" }} onLogout={onLogout} />

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, background: "#00d4ff15", border: "1px solid #00d4ff44", padding: "12px 24px", borderRadius: 12, color: "#00d4ff", fontWeight: 700, backdropFilter: "blur(10px)" }}>{toast.msg}</div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Laboratory Workflow 🔬</h1>
          <p style={{ color: "#5a7aa0", marginTop: 4 }}>Manage medical tests, upload reports, and track patient arrival priority.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, background: tab === t.id ? "rgba(0,212,255,0.1)" : "transparent", color: tab === t.id ? "#00d4ff" : "#5a7aa0", border: `1px solid ${tab === t.id ? "#00d4ff44" : "#1e2d4a"}` }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── QUEUE TAB ── */}
        {tab === "patients" && (
          <div>
            {patientGroups.map(pg => (
              <div key={pg.id} style={{ ...s.card, borderLeft: `4px solid ${pg.priority === "EMERGENCY" ? "#ef4444" : "#1e2d4a"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: "#00d4ff", fontWeight: 700, fontFamily: "monospace" }}>{pg.code}</span>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{pg.name}</h2>
                  </div>
                  {pg.priority === "EMERGENCY" && <span style={{ color: "#ef4444", fontWeight: 900, fontSize: 12 }}>🚨 EMERGENCY</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {pg.reports.map(r => (
                    <div key={r.id} style={{ background: "#060b14", border: "1px solid #1e2d4a", borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700 }}>{r.test_type}</span>
                        <Badge status={r.status} />
                      </div>
                      <div style={{ fontSize: 11, color: "#5a7aa0", marginTop: 8, fontFamily: "monospace" }}>{r.report_code}</div>

                      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                        {r.status === "PENDING" && <button onClick={() => updateStatusDirect(r.id, "IN_PROGRESS")} style={{ ...s.btn, flex: 1, background: "rgba(0,212,255,0.15)", color: "#00d4ff", border: "1px solid #00d4ff33" }}>Start Test</button>}
                        {r.status !== "COMPLETED" && <button onClick={() => { setTab("upload"); selectPatient(pg); setSelectedReport(r); }} style={{ ...s.btn, flex: 1 }}>Upload Report</button>}
                        {r.file_path && <a href={`http://localhost:8000/uploads/${r.file_path.split('/').pop()}`} target="_blank" rel="noreferrer" style={{ ...s.btn, textDecoration: "none", textAlign: "center", background: "#22c55e", color: "#000", flex: 1 }}>View PDF</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={s.card}>
              <label style={s.label}>1. Select Patient & Request</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input style={s.input} placeholder="Search ID or name..." value={search} onChange={e => setSearch(e.target.value)} />
                <button onClick={handlePatientSearch} style={s.btn}>Search</button>
              </div>
              {patients.map(p => (
                <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: 14, borderRadius: 10, cursor: "pointer", border: `1px solid ${selectedPatient?.id === p.id ? "#00d4ff" : "#1e2d4a"}`, marginBottom: 8, background: selectedPatient?.id === p.id ? "rgba(0,212,255,0.05)" : "transparent" }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#5a7aa0" }}>{p.patient_code} · {p.complaint}</div>
                </div>
              ))}
              {selectedPatient && (
                <div style={{ marginTop: 24 }}>
                  <label style={s.label}>Assigned Tests for {selectedPatient.name}</label>
                  {patientReports.map(r => (
                    <div key={r.id} onClick={() => setSelectedReport(r)} style={{ padding: 12, borderRadius: 8, cursor: "pointer", border: `1px solid ${selectedReport?.id === r.id ? "#00d4ff" : "#1e2d4a"}`, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                      <span>{r.test_type}</span>
                      <Badge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.card}>
              <label style={s.label}>2. Upload Final PDF/Image</label>
              <div style={{ background: "#060b14", borderRadius: 12, padding: 24, border: "2px dashed #1e2d4a", textAlign: "center", marginBottom: 20 }}>
                {selectedReport ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Target: {selectedReport.test_type}</div>
                    <div style={{ fontSize: 11, color: "#5a7aa0", marginBottom: 20 }}>Ref: {selectedReport.report_code}</div>
                    <input type="file" onChange={e => setUploadFile(e.target.files[0])} style={{ marginBottom: 10 }} />
                  </>
                ) : <span style={{ color: "#5a7aa0" }}>← Select a patient and test request first</span>}
              </div>
              <label style={s.label}>Lab Findings / Notes</label>
              <textarea style={s.input} rows={4} value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="Summary of test results..." />
              <button onClick={handleFinalUpload} disabled={uploading || !uploadFile} style={{ ...s.btn, width: "100%", marginTop: 20, py: 14, background: uploading ? "#5a7aa0" : "#00d4ff" }}>
                {uploading ? "Uploading..." : "Publish Final Report"}
              </button>
            </div>
          </div>
        )}

        {/* ── ALL TAB ── */}
        {tab === "all" && (
          <div style={s.card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 1 }}>
                  <th style={{ padding: 12 }}>Code</th>
                  <th style={{ padding: 12 }}>Patient</th>
                  <th style={{ padding: 12 }}>Test</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12 }}>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {allReports.map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #1e2d4a" }}>
                    <td style={{ padding: 14, fontFamily: "monospace", color: "#00d4ff" }}>{r.report_code}</td>
                    <td style={{ padding: 14 }}>{r.patient_name} <div style={{ fontSize: 10, color: "#5a7aa0" }}>{r.patient_code}</div></td>
                    <td style={{ padding: 14, fontWeight: 700 }}>{r.test_type}</td>
                    <td style={{ padding: 14 }}><Badge status={r.status} /></td>
                    <td style={{ padding: 14, fontSize: 12, color: "#5a7aa0" }}>{new Date(r.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
