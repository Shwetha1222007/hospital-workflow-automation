import React, { useState, useEffect } from "react";
import axios from "axios";
import { API, authAxios } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const SPECIALIZATIONS = ["CARDIOLOGIST", "ORTHOPEDIC", "NEUROLOGIST", "GENERAL", "PEDIATRICIAN", "OPHTHALMOLOGIST", "DERMATOLOGIST", "PSYCHIATRIST"];
const PRIORITY_COLOR = { NORMAL: "#22c55e", EMERGENCY: "#ef4444" };

const STATUS_MAP = {
  PENDING: ["#64748b", "Pending"],
  IN_PROGRESS: ["#f59e0b", "In Progress"],
  COMPLETED: ["#22c55e", "Completed"],
  DOCTOR_VISITED: ["#00d4ff", "Doctor Visited"],
  LAB_PENDING: ["#a855f7", "Lab Pending"],
  LAB_COMPLETED: ["#22c55e", "Lab Results Ready"],
  PHARMACY_PENDING: ["#f97316", "Pharmacy Pending"],
  BILLING_PENDING: ["#ec4899", "Billing Pending"],
  BILL_PAID: ["#22c55e", "Bill Paid"],
  DISCHARGED: ["#22c55e", "Discharged"],
};

function StatusBadge({ status }) {
  const [color, label] = STATUS_MAP[status] || ["#64748b", status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}44`, fontFamily: "monospace" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} /> {label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = (priority || "NORMAL").toUpperCase();
  const color = PRIORITY_COLOR[p] || "#22c55e";
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, color, background: `${color}15`, border: `1px solid ${color}33`, fontFamily: "monospace" }}>
      {p === "EMERGENCY" ? "🚨 " : ""}{p}
    </span>
  );
}

function AddStaffPanel({ type, doctors, onAdded, token }) {
  const [form, setForm] = useState({ email: "", password: "pass123", full_name: "", specialization: "GENERAL", doctor_id: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const endpoint = type === "DOCTOR" ? "/staff/doctors" : "/staff/nurses";
      const payload = type === "DOCTOR"
        ? { email: form.email, password: form.password, full_name: form.full_name, specialization: form.specialization }
        : { email: form.email, password: form.password, full_name: form.full_name, doctor_id: parseInt(form.doctor_id) };
      await axios.post(`${API}${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMsg({ type: "success", text: `${type.toLowerCase()} added!` });
      setForm({ email: "", password: "pass123", full_name: "", specialization: "GENERAL", doctor_id: "" });
      onAdded();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Failed" });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <input style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required placeholder="Full Name" />
      <input style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="Email" />
      <input style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Password" />
      {type === "DOCTOR" ? (
        <select style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}>
          {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <select style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} required>
          <option value="">-- Select Doctor --</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.specialization})</option>)}
        </select>
      )}
      {msg && <div style={{ fontSize: 12, color: msg.type === "success" ? "#22c55e" : "#ef4444" }}>{msg.type === "success" ? "✅ " : "⚠️ "}{msg.text}</div>}
      <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg,#00d4ff,#0099bb)", border: "none", padding: "12px", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer" }}>
        {loading ? "Adding..." : `Add ${type.toLowerCase()}`}
      </button>
    </form>
  );
}

function AddPatientPanel({ onAdded, token }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "Male", complaint: "", priority: "NORMAL" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setSuccess("");
    try {
      const res = await axios.post(`${API}/patients/`, form, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(`✅ Patient registered! ID: ${res.data.patient_code} → Dr. ${res.data.doctor_name || "General"} + Nurse ${res.data.nurse_name || "—"}`);
      setForm({ name: "", age: "", gender: "Male", complaint: "", priority: "NORMAL" });
      setTimeout(onAdded, 500);
    } catch (err) { alert("Failed: " + (err.response?.data?.detail || "Unknown error")); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 12 }}>
        <input style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none" }} placeholder="Patient Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none" }} type="number" placeholder="Age" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <select style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none" }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
        <select style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none" }} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
          <option value="NORMAL">Normal Priority</option>
          <option value="EMERGENCY">Emergency 🚨</option>
        </select>
      </div>
      <textarea style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none", minHeight: 80, resize: "none" }}
        placeholder="Complaint / Symptoms (e.g. fever, chest pain...)"
        value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} required />
      {success && <div style={{ color: "#22c55e", fontSize: 13, background: "#22c55e11", padding: "12px", borderRadius: 8, border: "1px solid #22c55e33" }}>{success}</div>}
      <button disabled={loading} type="submit" style={{ background: "#00d4ff", border: "none", padding: "13px", borderRadius: 8, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,212,255,0.2)", fontSize: 14 }}>
        {loading ? "Registering..." : "➕ Register & Auto-Assign Doctor + Nurse"}
      </button>
    </form>
  );
}

<<<<<<< HEAD
// ── Doctor Treatment Modal ────────────────────────────────────────────────────
function TreatPatientModal({ patient, token, onClose, onSaved }) {
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis || "");
  const [notes, setNotes] = useState(patient.treatment_notes || "");
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(false);
=======
/* ── Patient Workflow Board ──────────────────────────────────────────────── */

const BOARD_COLORS = {
  RED: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#ef4444" },
  GREEN: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", text: "#22c55e" },
  YELLOW: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "#f59e0b" },
  BLUE: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#3b82f6" },
};

function PatientWorkflowBoard() {
  const [tableData, setTableData] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterNurse, setFilterNurse] = useState("");
  const [filterStage, setFilterStage] = useState("");

  useEffect(() => {
    authAxios().get("/patients/admin-table")
      .then(r => setTableData(r.data))
      .catch(console.error);
  }, []);

  const openTimeline = async (patCode, patId, name) => {
    setDrawer({ patient_code: patCode, patient_id: patId, name });
    setTimeline(null);
    try {
      const r = await authAxios().get(`/movement-logs/patient/${patId}/summary`);
      setTimeline(r.data);
    } catch { setTimeline({ steps: [] }); }
  };

  const filtered = tableData
    .filter(r => !filterDoctor || r.doctor_name?.includes(filterDoctor))
    .filter(r => !filterNurse || r.nurse_name?.includes(filterNurse))
    .filter(r => !filterStage || r.current_stage?.toLowerCase().includes(filterStage.toLowerCase()));

  const uniqueDocs = [...new Set(tableData.map(r => r.doctor_name).filter(Boolean))];
  const uniqueNurse = [...new Set(tableData.map(r => r.nurse_name).filter(Boolean))];

  const card = { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🏥 Patient Workflow Board</h2>
        <div style={{ fontSize: 13, color: "#5a7aa0" }}>{filtered.length} patients</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          ["Doctor", filterDoctor, setFilterDoctor, uniqueDocs],
          ["Nurse", filterNurse, setFilterNurse, uniqueNurse],
        ].map(([label, val, setter, opts]) => (
          <select key={label} value={val} onChange={e => setter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#e2eaf5", fontSize: 12 }}>
            <option value="">All {label}s</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <input value={filterStage} onChange={e => setFilterStage(e.target.value)}
          placeholder="Filter by stage…"
          style={{ padding: "8px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#e2eaf5", fontSize: 12, flex: 1, minWidth: 160 }} />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#4a6a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, textAlign: "left" }}>
              {["ID", "Patient", "Doctor", "Nurse", "Current Stage", "Time in Stage", "Priority", ""].map(h => (
                <th key={h} style={{ padding: "10px 14px", borderBottom: "1px solid #1e2d4a" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const cm = BOARD_COLORS[row.stage_color] || BOARD_COLORS.YELLOW;
              const isDelay = row.time_in_stage_mins > 60;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #1e2d4a" }}>
                  <td style={{ padding: "14px", fontFamily: "monospace", color: "#00d4ff", fontWeight: 700 }}>{row.patient_code}</td>
                  <td style={{ padding: "14px", fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: "14px", color: "#5a7aa0", fontSize: 12 }}>{row.doctor_name || "—"}</td>
                  <td style={{ padding: "14px", color: "#5a7aa0", fontSize: 12 }}>{row.nurse_name || "—"}</td>
                  <td style={{ padding: "14px" }}>
                    <span style={{ background: cm.bg, border: `1px solid ${cm.border}`, color: cm.text, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                      {row.current_stage?.length > 35 ? row.current_stage.substring(0, 35) + "…" : row.current_stage}
                    </span>
                  </td>
                  <td style={{ padding: "14px" }}>
                    <span style={{ color: isDelay ? "#f59e0b" : "#5a7aa0", fontWeight: isDelay ? 700 : 400 }}>
                      {row.time_in_stage_mins}m {isDelay && "⚠️"}
                    </span>
                  </td>
                  <td style={{ padding: "14px" }}><PriorityBadge priority={row.priority} /></td>
                  <td style={{ padding: "14px" }}>
                    <button onClick={() => openTimeline(row.patient_code, row.patient_id, row.name)}
                      style={{ padding: "6px 12px", borderRadius: 8, background: "#00d4ff11", border: "1px solid #00d4ff33", color: "#00d4ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      📋 Timeline
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#5a7aa0" }}>No patients found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setDrawer(null)} />
          <div style={{ width: 420, background: "#0d1526", borderLeft: "1px solid #1e2d4a", overflowY: "auto", padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ color: "#00d4ff", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{drawer.patient_code}</div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{drawer.name}</div>
                <div style={{ color: "#5a7aa0", fontSize: 12, marginTop: 2 }}>Workflow Timeline</div>
              </div>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", color: "#5a7aa0", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            {!timeline && <div style={{ color: "#00d4ff", fontFamily: "monospace", fontSize: 12, padding: "20px 0" }}>Loading timeline…</div>}
            {timeline && (() => {
              const steps = timeline.steps || [];
              const actionLower = (timeline.current_stage || "").toLowerCase();
              // Determine which of the 4 stages is reached
              const stageIndex =
                actionLower.includes("complet") ? 3 :
                  actionLower.includes("lab") ? 2 :
                    actionLower.includes("doctor") || actionLower.includes("consult") ? 1 : 0;

              const progressSteps = ["Registered", "Doctor Review", "Lab Tests", "Completed"];

              return (
                <>
                  {/* ── Treatment Progress Bar ── */}
                  <div style={{ marginBottom: 24, background: "#060b14", borderRadius: 12, padding: 16, border: "1px solid #1e2d4a" }}>
                    <div style={{ fontSize: 10, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>
                      Workflow Progress
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {progressSteps.map((label, i) => {
                        const done = i <= stageIndex;
                        const active = i === stageIndex;
                        return (
                          <React.Fragment key={i}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: done ? (active ? "#00d4ff" : "#22c55e") : "#1e2d4a",
                                border: `2px solid ${done ? (active ? "#00d4ff" : "#22c55e") : "#2a3a5a"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: done ? 14 : 12, color: done ? "#fff" : "#4a6a8a",
                                boxShadow: active ? "0 0 12px rgba(0,212,255,0.5)" : "none",
                                transition: "all 0.3s",
                              }}>
                                {done && !active ? "✓" : i + 1}
                              </div>
                              <div style={{ fontSize: 9, color: done ? (active ? "#00d4ff" : "#22c55e") : "#4a6a8a", marginTop: 6, textAlign: "center", fontWeight: done ? 700 : 400 }}>
                                {label}
                              </div>
                            </div>
                            {i < progressSteps.length - 1 && (
                              <div style={{ height: 2, flex: 1, background: i < stageIndex ? "#22c55e" : "#1e2d4a", marginBottom: 20, transition: "all 0.3s" }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Current Stage Banner ── */}
                  <div style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                    <div style={{ fontSize: 10, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Current Stage</div>
                    <div style={{ color: "#00d4ff", fontWeight: 700, fontSize: 13 }}>{timeline.current_stage}</div>
                    <div style={{ color: "#4a6a8a", fontSize: 11, marginTop: 2 }}>⏱ {timeline.time_in_stage_mins} mins in this stage</div>
                  </div>

                  {/* ── Timeline Steps ── */}
                  <div style={{ fontSize: 10, color: "#5a7aa0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Event Log</div>
                  {steps.length === 0 && <div style={{ color: "#5a7aa0", fontSize: 13 }}>No events recorded yet.</div>}
                  {steps.map((step, idx) => {
                    const cm = BOARD_COLORS[step.color_code] || BOARD_COLORS.YELLOW;
                    return (
                      <div key={idx} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", background: cm.text, border: `2px solid ${cm.border}`, flexShrink: 0, marginTop: 3 }} />
                          {idx < steps.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e2d4a", marginTop: 4 }} />}
                        </div>
                        <div style={{ paddingBottom: 12 }}>
                          <div style={{ color: "#e2eaf5", fontWeight: 600, fontSize: 13 }}>{step.action}</div>
                          {step.actor_name && <div style={{ color: "#5a7aa0", fontSize: 11, marginTop: 2 }}>by {step.actor_name}</div>}
                          <div style={{ color: "#4a6a8a", fontSize: 11, marginTop: 2 }}>{new Date(step.timestamp).toLocaleString()}</div>
                          <span style={{ background: cm.bg, border: `1px solid ${cm.border}`, color: cm.text, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, marginTop: 4, display: "inline-block" }}>
                            {step.status || step.ref_type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────── */
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f

  useEffect(() => {
    axios.get(`${API}/lab-reports/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLabReports(r.data.filter(lr => lr.patient_id === patient.id)))
      .catch(() => { });
  }, [patient.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API}/patients/${patient.patient_code}`,
        { diagnosis, treatment_notes: notes, status: "IN_PROGRESS" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
      onClose();
    } catch { alert("Update failed"); }
    finally { setLoading(false); }
  };

  const s = {
    card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" },
    input: { width: "100%", background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none", resize: "none" },
    label: { fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", display: "block", marginBottom: 6, letterSpacing: 1, fontFamily: "monospace" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)", padding: 20 }}>
      <div style={{ ...s.card, width: "100%", maxWidth: 740, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Consultation</div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{patient.name}</h2>
            <div style={{ fontSize: 13, color: "#5a7aa0", marginTop: 4 }}>
              {patient.patient_code} · Priority: <span style={{ color: patient.priority === "EMERGENCY" ? "#ef4444" : "#22c55e" }}>{patient.priority}</span>
            </div>
            <div style={{ fontSize: 13, color: "#a0b8d0", marginTop: 6, fontStyle: "italic" }}>
              Complaint: "{patient.complaint}"
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 900, fontSize: 26, cursor: "pointer" }}>×</button>
        </div>

        {/* Lab Reports section */}
        {labReports.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={s.label}>🧪 Lab Reports ({labReports.length})</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {labReports.map(r => (
                <div key={r.id} style={{ background: "#060b14", border: `1px solid ${r.status === "COMPLETED" ? "#22c55e33" : "#1e2d4a"}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r.test_type}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a855f7", marginBottom: 6 }}>{r.report_code}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: r.status === "COMPLETED" ? "#22c55e" : "#f59e0b",
                      background: r.status === "COMPLETED" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                      border: `1px solid ${r.status === "COMPLETED" ? "#22c55e44" : "#f59e0b44"}`,
                      padding: "2px 8px", borderRadius: 20, fontFamily: "monospace",
                    }}>
                      {r.status === "COMPLETED" ? "✅ Done" : "⏳ " + r.status}
                    </span>
                    {r.file_path && (
                      <a href={`http://localhost:8000/api/lab-reports/${r.id}/download`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: "#00d4ff", textDecoration: "none", fontWeight: 700 }}>
                        📄 View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>Diagnosis</label>
          <textarea style={{ ...s.input, minHeight: 80 }} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter medical diagnosis..." />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={s.label}>Treatment Notes & Prescription</label>
          <textarea style={{ ...s.input, minHeight: 120 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Treatment plan, prescriptions, follow-up..." />
        </div>
        <button onClick={handleSave} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#22c55e", color: "#000", fontWeight: 800, border: "none", cursor: "pointer", fontSize: 14, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Saving..." : "✅ Save Consultation"}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard({ user, onLogout }) {
  const [view, setView] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [moveLogs, setMoveLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPat, setSelectedPat] = useState(null);
<<<<<<< HEAD
  const [filter, setFilter] = useState("ALL");
=======
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [ticketNotes, setTicketNotes] = useState({});
  const [toast, setToast] = useState("");
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f

  const isSuper = user.role === "SUPER_ADMIN";
  const token = localStorage.getItem("token");
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const ax = authAxios();
      const pRes = await ax.get("/patients/");
      setPatients(pRes.data);
      if (isSuper) {
<<<<<<< HEAD
        const [dRes, nRes] = await Promise.all([
          axios.get(`${API}/staff/doctors`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/staff/nurses`, { headers: { Authorization: `Bearer ${token}` } }),
=======
        const [dRes, nRes, tRes, lRes] = await Promise.all([
          ax.get("/staff/doctors"),
          ax.get("/staff/nurses"),
          ax.get("/tickets/"),
          ax.get("/movement-logs/"),
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
        ]);
        setDoctors(dRes.data);
        setNurses(nRes.data);
        setTickets(tRes.data);
        setMoveLogs(lRes.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = patients.filter(p => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const resolveTicket = async (ticketId, resolution) => {
    try {
      await authAxios().patch(`/tickets/${ticketId}/resolve`, { notes: resolution || "Resolved by admin" });
      showToast("✅ Ticket resolved");
      fetchData();
    } catch (err) { console.error("resolve error", err?.response?.data); }
  };

  const menu = isSuper ? [
    { id: "patients", label: "Patient Records", icon: "👥" },
    { id: "add-patient", label: "New Patient", icon: "➕" },
    { id: "tickets", label: `Tickets (${tickets.filter(t => t.status !== "RESOLVED").length} open)`, icon: "📩" },
    { id: "movement-logs", label: "Movement Logs", icon: "📋" },
    { id: "staff", label: "Manage Staff", icon: "🏥" },
  ] : [
    { id: "patients", label: "My Patients", icon: "👨‍⚕️" },
  ];

  const s = {
    wrap: { display: "flex", height: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" },
    side: { width: 260, background: "#0d1526", borderRight: "1px solid #1e2d4a", display: "flex", flexDirection: "column", padding: 24 },
    main: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" },
    card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" },
    btn: (active) => ({
      display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12,
      background: active ? "#00d4ff15" : "transparent", color: active ? "#00d4ff" : "#5a7aa0",
      border: active ? "1px solid #00d4ff33" : "1px solid transparent",
      cursor: "pointer", transition: "0.2s", marginBottom: 8, fontWeight: active ? 700 : 500,
      width: "100%", textAlign: "left",
    }),
  };

  return (
    <div style={s.wrap}>
      {/* Sidebar */}
      <div style={s.side}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <div style={{ width: 32, height: 32, background: "#00d4ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800 }}>+</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, color: "#00d4ff" }}>MedFlow</div>
        </div>

        <div style={{ flex: 1 }}>
          {menu.map(m => (
            <button key={m.id} style={s.btn(view === m.id)} onClick={() => setView(m.id)}>
              <span style={{ fontSize: 18 }}>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 20 }}>
          {[
            { label: "Total Patients", val: patients.length, color: "#00d4ff" },
            { label: "Emergency", val: patients.filter(p => p.priority === "EMERGENCY").length, color: "#ef4444" },
            { label: "Discharged", val: patients.filter(p => p.status === "DISCHARGED").length, color: "#22c55e" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e2d4a22", fontSize: 12 }}>
              <span style={{ color: "#5a7aa0" }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.val}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1e2d4a", paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "#00d4ff", textTransform: "uppercase", letterSpacing: 1 }}>{user.role.replace("_", " ")}</div>
          <button onClick={onLogout} style={{ marginTop: 16, width: "100%", padding: "10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        <Navbar user={{ full_name: user.name, role: user.role }} onLogout={onLogout} />
        {toast && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, padding: "12px 20px", color: "#00d4ff", fontWeight: 600, fontSize: 13, backdropFilter: "blur(10px)" }}>{toast}</div>
        )}

        <div style={{ padding: 40 }}>
<<<<<<< HEAD
          {/* Patient List */}
          {view === "patients" && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>{isSuper ? "All Patient Records" : "My Waiting List"}</h2>
                  <div style={{ fontSize: 13, color: "#5a7aa0", marginTop: 4 }}>
                    {patients.length} patient(s) · {patients.filter(p => p.status === "PENDING").length} waiting
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["ALL", "PENDING", "IN_PROGRESS", "LAB_COMPLETED", "PHARMACY_PENDING", "DISCHARGED"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                      padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: filter === f ? "#00d4ff22" : "#060b14",
                      border: `1px solid ${filter === f ? "#00d4ff44" : "#1e2d4a"}`,
                      color: filter === f ? "#00d4ff" : "#5a7aa0", transition: "0.15s",
                    }}>
                      {f.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{ color: "#00d4ff", fontFamily: "monospace", textAlign: "center", padding: 40 }}>Loading patients...</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                  <div>No patients found</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#4a6a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                        <th style={{ padding: 12 }}>ID</th>
                        <th style={{ padding: 12 }}>Patient</th>
                        <th style={{ padding: 12 }}>Spec / Doctor</th>
                        <th style={{ padding: 12 }}>Nurse</th>
                        <th style={{ padding: 12 }}>Priority</th>
                        <th style={{ padding: 12 }}>Status</th>
                        {!isSuper && <th style={{ padding: 12 }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1e2d4a" }}>
                          <td style={{ padding: 14, fontFamily: "monospace", color: "#00d4ff", fontSize: 13 }}>{p.patient_code}</td>
                          <td style={{ padding: 14 }}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#4a6a8a" }}>{p.age}y · {p.gender}</div>
                            <div style={{ fontSize: 11, color: "#5a7aa0", fontStyle: "italic", marginTop: 2 }}>"{p.complaint}"</div>
                          </td>
                          <td style={{ padding: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#00d4ff" }}>{p.specialization_required}</div>
                            <div style={{ fontSize: 11, color: "#5a7aa0" }}>👨‍⚕️ {p.doctor_name || "Unassigned"}</div>
                          </td>
                          <td style={{ padding: 14 }}>
                            <div style={{ fontSize: 12, color: "#f59e0b" }}>👩‍⚕️ {p.nurse_name || "—"}</div>
                          </td>
                          <td style={{ padding: 14 }}><PriorityBadge priority={p.priority} /></td>
                          <td style={{ padding: 14 }}><StatusBadge status={p.status} /></td>
                          {!isSuper && (
                            <td style={{ padding: 14 }}>
                              <button onClick={() => setSelectedPat(p)} style={{
                                padding: "8px 16px", borderRadius: 8, background: "#00d4ff11",
                                border: "1px solid #00d4ff44", color: "#00d4ff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                              }}>
                                🩺 Consult
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
=======
          {view === "patients" && <PatientWorkflowBoard />}
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f

          {/* Add Patient */}
          {view === "add-patient" && isSuper && (
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <div style={s.card}>
                <h2 style={{ marginTop: 0, color: "#00d4ff" }}>🏥 New Patient Admission</h2>
                <div style={{ fontSize: 13, color: "#5a7aa0", marginBottom: 24 }}>
                  System auto-detects specialization from complaint keywords and assigns the best-matching doctor + nurse.
                </div>
                <AddPatientPanel token={token} onAdded={fetchData} />
              </div>
            </div>
          )}

<<<<<<< HEAD
          {/* Staff Management */}
=======
          {view === "tickets" && isSuper && (() => {
            const activeT = tickets.filter(t => t.status !== "RESOLVED");
            const resolvedT = tickets.filter(t => t.status === "RESOLVED");
            return (
              <div>
                <h2 style={{ color: "#e2eaf5", marginBottom: 20 }}>📩 All Tickets</h2>

                {/* Active tickets */}
                <div style={{ color: "#4a6a8a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                  Active ({activeT.length})
                </div>
                {activeT.length === 0 && <div style={{ color: "#5a7aa0", marginBottom: 20 }}>No open tickets. 🎉</div>}
                {activeT.map(t => {
                  const tColor = { OPEN: "#f59e0b", IN_PROGRESS: "#3b82f6" }[t.status] || "#888";
                  return (
                    <div key={t.id} style={{ ...s.card, marginBottom: 12, padding: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.ticket_code} — <span style={{ color: "#00d4ff" }}>{t.department}</span></div>
                          <div style={{ color: "#5a7aa0", fontSize: 12, marginTop: 4 }}>{t.query_text}</div>
                          {t.assignee_name && <div style={{ color: "#4a6a8a", fontSize: 11, marginTop: 4 }}>Assigned to: {t.assignee_name}</div>}
                          <div style={{ color: "#4a6a8a", fontSize: 11, marginTop: 2 }}>{new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        <span style={{ background: `${tColor}20`, border: `1px solid ${tColor}50`, color: tColor, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{t.status}</span>
                      </div>
                      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          placeholder="Resolution notes…"
                          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", fontSize: 12 }}
                          value={ticketNotes[t.id] || ""}
                          onChange={e => setTicketNotes(n => ({ ...n, [t.id]: e.target.value }))}
                        />
                        <button onClick={() => resolveTicket(t.id, ticketNotes[t.id])}
                          style={{ padding: "8px 14px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, color: "#22c55e", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                          ✓ Resolve
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Resolved history */}
                {resolvedT.length > 0 && (
                  <div style={{ marginTop: 24, opacity: 0.6 }}>
                    <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                      ✅ Resolved History ({resolvedT.length})
                    </div>
                    {resolvedT.map(t => (
                      <div key={t.id} style={{ ...s.card, marginBottom: 8, padding: 14, borderLeft: "3px solid rgba(34,197,94,0.4)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ color: "#e2eaf5", fontWeight: 700, fontSize: 13 }}>{t.ticket_code} — <span style={{ color: "#00d4ff" }}>{t.department}</span></div>
                            <div style={{ color: "#5a7aa0", fontSize: 12 }}>{t.query_text}</div>
                            {t.notes && <div style={{ color: "#22c55e", fontSize: 11, marginTop: 4 }}>📝 {t.notes}</div>}
                          </div>
                          <span style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>RESOLVED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── MOVEMENT LOGS ── */}
          {view === "movement-logs" && isSuper && (
            <div>
              <h2 style={{ color: "#e2eaf5", marginBottom: 20 }}>📋 Movement Logs — Full Audit Trail</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#4a6a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                      <th style={{ padding: "10px 12px" }}>Time</th>
                      <th style={{ padding: "10px 12px" }}>Type</th>
                      <th style={{ padding: "10px 12px" }}>Ref ID</th>
                      <th style={{ padding: "10px 12px" }}>From</th>
                      <th style={{ padding: "10px 12px" }}>To</th>
                      <th style={{ padding: "10px 12px" }}>Action</th>
                      <th style={{ padding: "10px 12px" }}>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moveLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: "1px solid #1e2d4a" }}>
                        <td style={{ padding: "12px", fontSize: 11, color: "#5a7aa0" }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ background: log.ref_type === "PATIENT" ? "rgba(0,212,255,0.1)" : "rgba(245,158,11,0.1)", color: log.ref_type === "PATIENT" ? "#00d4ff" : "#f59e0b", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                            {log.ref_type}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontFamily: "monospace", color: "#e2eaf5" }}>#{log.reference_id}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "#5a7aa0" }}>{log.from_department || "—"}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "#00d4ff", fontWeight: 600 }}>{log.to_department}</td>
                        <td style={{ padding: "12px", fontSize: 12 }}>{log.action}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: "#a3e635" }}>{log.actor_name || "System"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {moveLogs.length === 0 && <div style={{ color: "#5a7aa0", marginTop: 20 }}>No movement logs yet. They appear when patients are assigned, tickets are created/resolved, etc.</div>}
              </div>
            </div>
          )}

          {/* ── STAFF ── */}
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
          {view === "staff" && isSuper && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div style={s.card}>
                  <h3 style={{ marginTop: 0, color: "#22c55e" }}>➕ Register Doctor</h3>
                  <AddStaffPanel type="DOCTOR" onAdded={fetchData} token={token} />
                </div>
                <div style={s.card}>
                  <h3 style={{ marginTop: 0, color: "#f59e0b" }}>➕ Register Nurse</h3>
                  <AddStaffPanel type="NURSE" doctors={doctors} onAdded={fetchData} token={token} />
                </div>
              </div>
              <div style={s.card}>
                <h3 style={{ marginTop: 0 }}>Staff Roster</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
<<<<<<< HEAD
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 12 }}>Doctors ({doctors.length})</h4>
=======
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase" }}>Doctors ({doctors.length})</h4>
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
                    {doctors.map(d => (
                      <div key={d.id} style={{ background: "#060b14", padding: 14, borderRadius: 10, marginBottom: 8, border: "1px solid #1e2d4a" }}>
                        <div style={{ fontWeight: 700 }}>{d.full_name}</div>
                        <div style={{ fontSize: 11, color: "#00d4ff" }}>{d.specialization}</div>
                        <div style={{ fontSize: 10, color: "#5a7aa0", marginTop: 2 }}>{d.nurse_count} Nurses · {d.patient_count} Patients</div>
                      </div>
                    ))}
                  </div>
                  <div>
<<<<<<< HEAD
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 12 }}>Nurses ({nurses.length})</h4>
=======
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase" }}>Nurses ({nurses.length})</h4>
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
                    {nurses.map(n => (
                      <div key={n.id} style={{ background: "#060b14", padding: 14, borderRadius: 10, marginBottom: 8, border: "1px solid #1e2d4a" }}>
                        <div style={{ fontWeight: 700 }}>{n.full_name}</div>
                        <div style={{ fontSize: 11, color: "#f59e0b" }}>→ {n.doctor_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

<<<<<<< HEAD
      {/* Treat Modal */}
      {selectedPat && (
        <TreatPatientModal
          patient={selectedPat} token={token}
          onClose={() => setSelectedPat(null)} onSaved={fetchData}
        />
      )}
=======
        {/* Treatment Modal */}
        {selectedPat && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
            <div style={{ ...s.card, width: "100%", maxWidth: 640 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Treat Patient: {selectedPat.name}</h2>
                  <div style={{ fontSize: 13, color: "#5a7aa0", marginTop: 4 }}>Complaint: "{selectedPat.complaint}"</div>
                </div>
                <button onClick={() => setSelectedPat(null)} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 900, fontSize: 24, cursor: "pointer" }}>&times;</button>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Final Diagnosis</label>
                <textarea style={{ width: "100%", minHeight: 80, background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: 12, borderRadius: 10, outline: "none", resize: "none" }} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter medical diagnosis..." />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Treatment & Prescription Notes</label>
                <textarea style={{ width: "100%", minHeight: 120, background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: 12, borderRadius: 10, outline: "none", resize: "none" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Next steps, medications, etc..." />
              </div>

              <button onClick={handleUpdate} style={{ width: "100%", padding: 14, borderRadius: 12, background: "#00d4ff", color: "#000", fontWeight: 800, border: "none", cursor: "pointer" }}>✅ Complete Consultation</button>
            </div>
          </div>
        )}
      </div>
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
    </div>
  );
}
