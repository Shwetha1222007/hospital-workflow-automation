import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const SPECIALIZATIONS = ["CARDIOLOGIST", "ORTHOPEDIC", "NEUROLOGIST", "GENERAL", "PEDIATRICIAN", "OPHTHALMOLOGIST", "DERMATOLOGIST", "PSYCHIATRIST"];
const PRIORITY_COLOR = { NORMAL: "#22c55e", EMERGENCY: "#ef4444" };

/* ── Components ────────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cfg = {
    PENDING: ["#64748b", "rgba(100,116,139,0.12)", "Pending"],
    IN_PROGRESS: ["#f59e0b", "rgba(245,158,11,0.12)", "In Progress"],
    COMPLETED: ["#22c55e", "rgba(34,197,94,0.12)", "Completed"],
  }[status] || ["#64748b", "rgba(100,116,139,0.12)", status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg[0], background: cfg[1], border: `1px solid ${cfg[0]}33`, fontFamily: "monospace" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg[0] }} /> {cfg[2]}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = priority?.toUpperCase() || "NORMAL";
  const color = PRIORITY_COLOR[p] || "#22c55e";
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, color, background: `${color}15`, border: `1px solid ${color}33`, fontFamily: "monospace" }}>
      {p === "EMERGENCY" ? "🚨 " : ""} {p}
    </span>
  );
}

/* ── Panels ────────────────────────────────────────────────────────────── */

function AddStaffPanel({ type, doctors, onAdded, token }) {
  const [form, setForm] = useState({ email: "", password: "pass123", full_name: "", specialization: "GENERAL", doctor_id: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const endpoint = type === "DOCTOR" ? "/staff/doctors" : "/staff/nurses";
      const payload = type === "DOCTOR" ?
        { email: form.email, password: form.password, full_name: form.full_name, specialization: form.specialization } :
        { email: form.email, password: form.password, full_name: form.full_name, doctor_id: parseInt(form.doctor_id) };

      await axios.post(`${API}${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMsg({ type: "success", text: `${type.toLowerCase()} added successfully!` });
      setForm({ email: "", password: "pass123", full_name: "", specialization: "GENERAL", doctor_id: "" });
      onAdded();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Failed to add staff" });
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
      <div>
        <label style={{ fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Full Name</label>
        <input style={{ width: "100%", background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required placeholder="John Doe" />
      </div>
      <div>
        <label style={{ fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Email</label>
        <input style={{ width: "100%", background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="staff@medflow.com" />
      </div>
      {type === "DOCTOR" ? (
        <div>
          <label style={{ fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Specialization</label>
          <select style={{ width: "100%", background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}>
            {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label style={{ fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 4, display: "block" }}>Assign to Doctor</label>
          <select style={{ width: "100%", background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px", borderRadius: 8, outline: "none" }} value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} required>
            <option value="">-- Select Doctor --</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.specialization})</option>)}
          </select>
        </div>
      )}
      {msg && <div style={{ fontSize: 12, color: msg.type === "success" ? "#22c55e" : "#ef4444", marginTop: 4 }}>{msg.type === "success" ? "✅ " : "⚠️ "}{msg.text}</div>}
      <button type="submit" disabled={loading} style={{ background: "linear-gradient(135deg,#00d4ff,#0099bb)", border: "none", padding: "12px", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
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
      setSuccess(`registered! ID: ${res.data.patient_code} assigned to ${res.data.doctor_name || "General"}`);
      setForm({ name: "", age: "", gender: "Male", complaint: "", priority: "NORMAL" });
      onAdded();
    } catch (err) {
      alert("Failed to add patient");
    } finally { setLoading(false); }
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
      <textarea style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "11px", borderRadius: 8, outline: "none", minHeight: 80, resize: "none" }} placeholder="Complaint / Symptoms (e.g. Heart pain, Bone fracture...)" value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} required />

      {success && <div style={{ color: "#22c55e", fontSize: 13, background: "#22c55e11", padding: "10px", borderRadius: 8, border: "1px solid #22c55e33" }}>✅ Patient {success}</div>}

      <button disabled={loading} type="submit" style={{ background: "#00d4ff", border: "none", padding: "12px", borderRadius: 8, color: "#000", fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,212,255,0.2)" }}>
        {loading ? "Registering..." : "➕ Register & Auto-Assign"}
      </button>
    </form>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────── */

export default function AdminDashboard({ user, onLogout }) {
  const [view, setView] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPat, setSelectedPat] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const isSuper = user.role === "SUPER_ADMIN";
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    try {
      const pRes = await axios.get(`${API}/patients/`, { headers: { Authorization: `Bearer ${token}` } });
      setPatients(pRes.data);
      if (isSuper) {
        const dRes = await axios.get(`${API}/staff/doctors`, { headers: { Authorization: `Bearer ${token}` } });
        setDoctors(dRes.data);
        const nRes = await axios.get(`${API}/staff/nurses`, { headers: { Authorization: `Bearer ${token}` } });
        setNurses(nRes.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdate = async () => {
    try {
      await axios.patch(`${API}/patients/${selectedPat.patient_code}`, { diagnosis, treatment_notes: notes, status: "IN_PROGRESS" }, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedPat(null);
      fetchData();
    } catch (err) { alert("Update failed"); }
  };

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
    btn: (active) => ({ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 12, background: active ? "#00d4ff15" : "transparent", color: active ? "#00d4ff" : "#5a7aa0", border: active ? "1px solid #00d4ff33" : "1px solid transparent", cursor: "pointer", transition: "0.2s", marginBottom: 8, fontWeight: active ? 700 : 500 }),
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

        <div style={{ borderTop: "1px solid #1e2d4a", paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "#00d4ff", textTransform: "uppercase", letterSpacing: 1 }}>{user.role.replace("_", " ")}</div>
          <button onClick={onLogout} style={{ marginTop: 16, width: "100%", padding: "10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={s.main}>
        <Navbar user={{ full_name: user.name, role: user.role }} onLogout={onLogout} />

        <div style={{ padding: 40 }}>
          {view === "patients" && (
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}>{isSuper ? "Global Patient Records" : "My Assigned Patients"}</h2>
                <div style={{ fontSize: 13, color: "#5a7aa0" }}>{patients.length} records found</div>
              </div>

              {loading ? <div style={{ color: "#00d4ff", fontFamily: "monospace" }}>Fetching cloud data...</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#4a6a8a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                        <th style={{ padding: 12 }}>ID</th>
                        <th style={{ padding: 12 }}>Patient</th>
                        <th style={{ padding: 12 }}>Spec / Doctor</th>
                        <th style={{ padding: 12 }}>Priority</th>
                        <th style={{ padding: 12 }}>Status</th>
                        {!isSuper && <th style={{ padding: 12 }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map(p => (
                        <tr key={p.id} style={{ borderBottom: "1px solid #1e2d4a" }}>
                          <td style={{ padding: 16, fontFamily: "monospace", color: "#00d4ff" }}>{p.patient_code}</td>
                          <td style={{ padding: 16 }}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#4a6a8a" }}>{p.age}y · {p.gender}</div>
                          </td>
                          <td style={{ padding: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{p.specialization_required}</div>
                            <div style={{ fontSize: 11, color: "#5a7aa0" }}>👨‍⚕️ {p.doctor_name || "Unassigned"}</div>
                          </td>
                          <td style={{ padding: 16 }}><PriorityBadge priority={p.priority} /></td>
                          <td style={{ padding: 16 }}><StatusBadge status={p.status} /></td>
                          {!isSuper && (
                            <td style={{ padding: 16 }}>
                              <button onClick={() => { setSelectedPat(p); setDiagnosis(p.diagnosis || ""); setNotes(p.treatment_notes || ""); }} style={{ padding: "6px 14px", borderRadius: 8, background: "#00d4ff11", border: "1px solid #00d4ff44", color: "#00d4ff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Treat</button>
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

          {view === "add-patient" && isSuper && (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={s.card}>
                <h2 style={{ marginTop: 0, color: "#00d4ff" }}>New Patient Admission</h2>
                <div style={{ fontSize: 13, color: "#5a7aa0", marginBottom: 24 }}>System automatically detects specialization from complaints and assigns keywords to doctors.</div>
                <AddPatientPanel token={token} onAdded={fetchData} />
              </div>
            </div>
          )}

          {view === "staff" && isSuper && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, color: "#22c55e" }}>➕ Register Doctor</h3>
                <AddStaffPanel type="DOCTOR" onAdded={fetchData} token={token} />
              </div>
              <div style={s.card}>
                <h3 style={{ marginTop: 0, color: "#f59e0b" }}>➕ Register Nurse</h3>
                <AddStaffPanel type="NURSE" doctors={doctors} onAdded={fetchData} token={token} />
              </div>
              <div style={{ ...s.card, gridColumn: "span 2" }}>
                <h3 style={{ marginTop: 0 }}>Staff Roster</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div>
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase" }}>Doctors</h4>
                    {doctors.map(d => (
                      <div key={d.id} style={{ background: "#060b14", padding: 12, borderRadius: 10, marginBottom: 8, border: "1px solid #1e2d4a" }}>
                        <div style={{ fontWeight: 700 }}>{d.full_name}</div>
                        <div style={{ fontSize: 11, color: "#00d4ff" }}>{d.specialization}</div>
                        <div style={{ fontSize: 10, color: "#5a7aa0" }}>{d.nurse_count} Nurses · {d.patient_count} Patients</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 12, color: "#4a6a8a", textTransform: "uppercase" }}>Nurses</h4>
                    {nurses.map(n => (
                      <div key={n.id} style={{ background: "#060b14", padding: 12, borderRadius: 10, marginBottom: 8, border: "1px solid #1e2d4a" }}>
                        <div style={{ fontWeight: 700 }}>{n.full_name}</div>
                        <div style={{ fontSize: 11, color: "#f59e0b" }}>Assigned to: {n.doctor_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
  );
}
