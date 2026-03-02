import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../context/AuthContext";
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

// ── Doctor Treatment Modal ────────────────────────────────────────────────────
function TreatPatientModal({ patient, token, onClose, onSaved }) {
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis || "");
  const [notes, setNotes] = useState(patient.treatment_notes || "");
  const [labReports, setLabReports] = useState([]);
  const [loading, setLoading] = useState(false);

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
  const [loading, setLoading] = useState(true);
  const [selectedPat, setSelectedPat] = useState(null);
  const [filter, setFilter] = useState("ALL");

  const isSuper = user.role === "SUPER_ADMIN";
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await axios.get(`${API}/patients/`, { headers: { Authorization: `Bearer ${token}` } });
      setPatients(pRes.data);
      if (isSuper) {
        const [dRes, nRes] = await Promise.all([
          axios.get(`${API}/staff/doctors`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/staff/nurses`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setDoctors(dRes.data);
        setNurses(nRes.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = patients.filter(p => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const menu = isSuper ? [
    { id: "patients", label: "Patient Records", icon: "👥" },
    { id: "add-patient", label: "New Patient", icon: "➕" },
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

        <div style={{ padding: 40 }}>
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

          {/* Staff Management */}
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
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 12 }}>Doctors ({doctors.length})</h4>
                    {doctors.map(d => (
                      <div key={d.id} style={{ background: "#060b14", padding: 14, borderRadius: 10, marginBottom: 8, border: "1px solid #1e2d4a" }}>
                        <div style={{ fontWeight: 700 }}>{d.full_name}</div>
                        <div style={{ fontSize: 11, color: "#00d4ff" }}>{d.specialization}</div>
                        <div style={{ fontSize: 10, color: "#5a7aa0", marginTop: 2 }}>{d.nurse_count} Nurses · {d.patient_count} Patients</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 12 }}>Nurses ({nurses.length})</h4>
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
      </div>

      {/* Treat Modal */}
      {selectedPat && (
        <TreatPatientModal
          patient={selectedPat} token={token}
          onClose={() => setSelectedPat(null)} onSaved={fetchData}
        />
      )}
    </div>
  );
}
