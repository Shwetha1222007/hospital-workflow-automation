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

const BOARD_COLORS = {
  RED: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#ef4444" },
  GREEN: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", text: "#22c55e" },
  YELLOW: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "#f59e0b" },
  BLUE: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#3b82f6" },
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

function AddStaffPanel({ type, doctors, onAdded }) {
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
      await authAxios().post(endpoint, payload);
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

function AddPatientPanel({ onAdded }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "Male", complaint: "", priority: "NORMAL" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setSuccess("");
    try {
      const res = await authAxios().post("/patients/", form);
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

// ── Doctor Treatment Modal ────────────────────────────────────────────────────
function TreatPatientModal({ patient, onClose, onSaved }) {
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis || "");
  const [notes, setNotes] = useState(patient.treatment_notes || "");
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authAxios().get("/lab-reports/")
      .then(r => setLabReports(r.data.filter(lr => lr.patient_id === patient.id)))
      .catch(() => { });
  }, [patient.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await authAxios().patch(`/patients/${patient.patient_code}`,
        { diagnosis, treatment_notes: notes, status: "IN_PROGRESS" }
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
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ef4444", fontWeight: 900, fontSize: 26, cursor: "pointer" }}>×</button>
        </div>

        {labReports.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={s.label}>🧪 Lab Reports ({labReports.length})</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {labReports.map(r => (
                <div key={r.id} style={{ background: "#060b14", border: `1px solid ${r.status === "COMPLETED" ? "#22c55e33" : "#1e2d4a"}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r.test_type}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a855f7", marginBottom: 6 }}>{r.report_code}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.status === "COMPLETED" ? "#22c55e" : "#f59e0b" }}>
                      {r.status === "COMPLETED" ? "✅ Done" : "⏳ " + r.status}
                    </span>
                    {r.file_path && (
                      <a href={`http://localhost:8000/uploads/${r.file_path.split('/').pop()}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#00d4ff", textDecoration: "none", fontWeight: 700 }}>📄 View</a>
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

// ── Patient Workflow Board ────────────────────────────────────────────────
function PatientWorkflowBoard() {
  const [tableData, setTableData] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterNurse, setFilterNurse] = useState("");
  const [filterStage, setFilterStage] = useState("");

  const fetchBoard = () => {
    authAxios().get("/patients/admin-table")
      .then(r => setTableData(r.data))
      .catch(console.error);
  };

  useEffect(() => { fetchBoard(); }, []);

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

  return (
    <div style={{ background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🏥 Patient Workflow Board</h2>
        <div style={{ fontSize: 13, color: "#5a7aa0" }}>{filtered.length} patients</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#e2eaf5", fontSize: 12 }}>
          <option value="">All Doctors</option>
          {uniqueDocs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterNurse} onChange={e => setFilterNurse(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#e2eaf5", fontSize: 12 }}>
          <option value="">All Nurses</option>
          {uniqueNurse.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input value={filterStage} onChange={e => setFilterStage(e.target.value)} placeholder="Filter by stage…" style={{ padding: "8px 12px", borderRadius: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#e2eaf5", fontSize: 12, flex: 1, minWidth: 160 }} />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#4a6a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, textAlign: "left" }}>
              {["ID", "Patient", "Doctor", "Nurse", "Current Stage", "Time", "Priority", ""].map(h => <th key={h} style={{ padding: "10px 14px", borderBottom: "1px solid #1e2d4a" }}>{h}</th>)}
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
                      {row.current_stage || "Registered"}
                    </span>
                  </td>
                  <td style={{ padding: "14px", color: isDelay ? "#ef4444" : "#5a7aa0" }}>{row.time_in_stage_mins}m</td>
                  <td style={{ padding: "14px" }}><PriorityBadge priority={row.priority} /></td>
                  <td style={{ padding: "14px" }}>
                    <button onClick={() => openTimeline(row.patient_code, row.patient_id, row.name)} style={{ padding: "6px 12px", borderRadius: 8, background: "#00d4ff11", border: "1px solid #00d4ff33", color: "#00d4ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📋 Timeline</button>
                  </td>
                </tr>
              );
            })}
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
              </div>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", color: "#5a7aa0", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            {!timeline ? <div style={{ color: "#00d4ff", fontSize: 12 }}>Loading…</div> : (
              <>
                {timeline.steps?.map((step, idx) => {
                  const cm = BOARD_COLORS[step.color_code] || BOARD_COLORS.YELLOW;
                  return (
                    <div key={idx} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: cm.text, flexShrink: 0, marginTop: 4 }} />
                        {idx < timeline.steps.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e2d4a", marginTop: 4 }} />}
                      </div>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{step.action}</div>
                        <div style={{ color: "#5a7aa0", fontSize: 11 }}>{new Date(step.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────
export default function AdminDashboard({ user, onLogout }) {
  const [view, setView] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [moveLogs, setMoveLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPat, setSelectedPat] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [toast, setToast] = useState("");
  const [ticketNotes, setTicketNotes] = useState({});

  const isSuper = user.role === "SUPER_ADMIN";
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await authAxios().get("/patients/");
      setPatients(pRes.data);
      if (isSuper) {
        const [dRes, nRes, tRes, lRes] = await Promise.all([
          authAxios().get("/staff/doctors"),
          authAxios().get("/staff/nurses"),
          authAxios().get("/tickets/"),
          authAxios().get("/movement-logs/"),
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

  const resolveTicket = async (ticketId, resolution) => {
    try {
      await authAxios().patch(`/tickets/${ticketId}/resolve`, { notes: resolution || "Resolved by admin" });
      showToast("✅ Ticket resolved");
      fetchData();
    } catch (err) { console.error(err); }
  };

  const filteredPatients = patients.filter(p => filter === "ALL" || p.status === filter);

  const menu = isSuper ? [
    { id: "patients", label: "Workflow Board", icon: "🏥" },
    { id: "patient-list", label: "Patient Records", icon: "👥" },
    { id: "add-patient", label: "New Patient", icon: "➕" },
    { id: "tickets", label: `Tickets (${tickets.filter(t => t.status !== "RESOLVED").length})`, icon: "📩" },
    { id: "movement-logs", label: "Movement Logs", icon: "📋" },
    { id: "staff", label: "Manage Staff", icon: "👨‍💼" },
  ] : [
    { id: "patients", label: "My Patients", icon: "🩺" },
  ];

  const s = {
    wrap: { display: "flex", height: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'Inter', sans-serif" },
    side: { width: 260, background: "#0d1526", borderRight: "1px solid #1e2d4a", display: "flex", flexDirection: "column", padding: 24 },
    main: { flex: 1, overflowY: "auto" },
    card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24 },
    btn: (active) => ({
      display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12,
      background: active ? "#00d4ff15" : "transparent", color: active ? "#00d4ff" : "#5a7aa0",
      border: active ? "1px solid #00d4ff33" : "1px solid transparent",
      cursor: "pointer", transition: "0.2s", marginBottom: 8, fontWeight: active ? 700 : 500,
      width: "100%", textAlign: "left", fontSize: 14
    }),
  };

  return (
    <div style={s.wrap}>
      <div style={s.side}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#00d4ff", marginBottom: 40, fontFamily: "monospace" }}>+ MedFlow</div>
        <div style={{ flex: 1 }}>
          {menu.map(m => (
            <button key={m.id} style={s.btn(view === m.id)} onClick={() => setView(m.id)}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
        <div style={{ paddingTop: 20, borderTop: "1px solid #1e2d4a" }}>
          <div style={{ fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "#00d4ff" }}>{user.role}</div>
          <button onClick={onLogout} style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "#ef444415", border: "1px solid #ef444433", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      <div style={s.main}>
        <Navbar user={{ full_name: user.name, role: user.role }} onLogout={onLogout} />
        <div style={{ padding: 32 }}>
          {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, background: "#00d4ff15", border: "1px solid #00d4ff44", padding: "12px 24px", borderRadius: 12, color: "#00d4ff", fontWeight: 700 }}>{toast}</div>}

          {view === "patients" && isSuper && <PatientWorkflowBoard />}

          {(view === "patient-list" || (view === "patients" && !isSuper)) && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <h2>{isSuper ? "All Patients" : "My Consulting Queue"}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {["ALL", "PENDING", "IN_PROGRESS", "LAB_COMPLETED", "DISCHARGED"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 11, background: filter === f ? "#00d4ff22" : "#060b14", border: `1px solid ${filter === f ? "#00d4ff" : "#1e2d4a"}`, color: filter === f ? "#00d4ff" : "#5a7aa0", cursor: "pointer" }}>{f}</button>
                  ))}
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 11, color: "#4a6a8a", textTransform: "uppercase" }}>
                    <th style={{ padding: 12 }}>ID</th>
                    <th style={{ padding: 12 }}>Name</th>
                    <th style={{ padding: 12 }}>Status</th>
                    <th style={{ padding: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #1e2d4a" }}>
                      <td style={{ padding: 14, fontFamily: "monospace", color: "#00d4ff" }}>{p.patient_code}</td>
                      <td style={{ padding: 14 }}>{p.name} <span style={{ fontSize: 11, color: "#5a7aa0" }}>({p.age}y)</span></td>
                      <td style={{ padding: 14 }}><StatusBadge status={p.status} /></td>
                      <td style={{ padding: 14 }}>
                        <button onClick={() => setSelectedPat(p)} style={{ padding: "6px 14px", borderRadius: 8, background: "#00d4ff15", border: "1px solid #00d4ff44", color: "#00d4ff", cursor: "pointer", fontWeight: 700 }}>Consult</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "add-patient" && <div style={{ maxWidth: 600, margin: "0 auto" }}><div style={s.card}><h3>Register New Patient</h3><AddPatientPanel onAdded={fetchData} /></div></div>}

          {view === "tickets" && (
            <div>
              <h2 style={{ marginBottom: 20 }}>📩 System Tickets</h2>
              {tickets.filter(t => t.status !== "RESOLVED").map(t => (
                <div key={t.id} style={{ ...s.card, marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>{t.ticket_code} — {t.department}</div>
                  <div style={{ color: "#5a7aa0", fontSize: 13, marginTop: 4 }}>{t.query_text}</div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <input placeholder="Resolution..." style={{ flex: 1, padding: 8, background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", borderRadius: 8 }} value={ticketNotes[t.id] || ""} onChange={e => setTicketNotes({ ...ticketNotes, [t.id]: e.target.value })} />
                    <button onClick={() => resolveTicket(t.id, ticketNotes[t.id])} style={{ background: "#22c55e", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Resolve</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "movement-logs" && (
            <div style={s.card}>
              <h2>📋 Global Movement History</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                <thead><tr style={{ textAlign: "left", fontSize: 11, color: "#4a6a8a" }}><th>Time</th><th>Patient</th><th>Action</th><th>Actor</th></tr></thead>
                <tbody>
                  {moveLogs.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #1e2d4a" }}>
                      <td style={{ padding: 10, fontSize: 11 }}>{new Date(l.timestamp).toLocaleString()}</td>
                      <td style={{ padding: 10 }}>#{l.patient_ids || l.reference_id}</td>
                      <td style={{ padding: 10 }}>{l.action}</td>
                      <td style={{ padding: 10, color: "#00d4ff" }}>{l.actor_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "staff" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div style={s.card}><h4>Add Doctor</h4><AddStaffPanel type="DOCTOR" onAdded={fetchData} /></div>
                <div style={s.card}><h4>Add Nurse</h4><AddStaffPanel type="NURSE" doctors={doctors} onAdded={fetchData} /></div>
              </div>
              <div style={s.card}>
                <h4>Staff List</h4>
                {doctors.map(d => <div key={d.id} style={{ padding: 10, borderBottom: "1px solid #1e2d4a" }}>{d.full_name} ({d.specialization})</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPat && <TreatPatientModal patient={selectedPat} onClose={() => setSelectedPat(null)} onSaved={fetchData} />}
    </div>
  );
}
