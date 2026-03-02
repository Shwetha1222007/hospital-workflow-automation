import React, { useState, useEffect } from "react";
import { authAxios } from "../context/AuthContext";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg: "#0a0f1e",
    card: "rgba(255,255,255,0.04)",
    border: "rgba(0,212,255,0.12)",
    cyan: "#00d4ff",
    blue: "#0077ff",
    text: "#e8eaf0",
    sub: "rgba(255,255,255,0.45)",
};

const badge = (color, txt) => (
    <span style={{
        background: `${color}20`, border: `1px solid ${color}50`,
        color, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700,
    }}>{txt}</span>
);

const statusColor = { PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#22c55e", LAB_IN_PROGRESS: "#a855f7", LAB_COMPLETED: "#22c55e" };
const ticketColor = { OPEN: "#f59e0b", IN_PROGRESS: "#3b82f6", RESOLVED: "#22c55e" };

const ax = () => authAxios();

const COLOR_MAP = {
    RED: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#ef4444" },
    GREEN: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", text: "#22c55e" },
    YELLOW: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "#f59e0b" },
    BLUE: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#3b82f6" },
};

// ── Doctor Dashboard ──────────────────────────────────────────────────────────
export default function DoctorDashboard({ user, onLogout }) {
    const [tab, setTab] = useState("patients");
    const [patients, setPatients] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [labTasks, setLabTasks] = useState([]);
    const [selected, setSelected] = useState(null);
    const [notes, setNotes] = useState({ diagnosis: "", treatment_notes: "", status: "" });
    const [prescribe, setPrescribe] = useState({ patient_id: "", medicine: "", dosage: "", duration: "" });
    const [toast, setToast] = useState("");
    const [ticketNotes, setTicketNotes] = useState({});
    const [timelineModal, setTimelineModal] = useState(null); // { patient }

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [p, t, l] = await Promise.all([
                ax().get("/patients/"),
                ax().get("/tickets/"),
                ax().get("/lab-reports/"),
            ]);
            setPatients(p.data);
            setTickets(t.data);
            setLabTasks(l.data);
        } catch { }
    };

    const openTimeline = async (p) => {
        setTimelineModal({ patient: p, steps: null });
        try {
            const r = await ax().get(`/movement-logs/patient/${p.id}/summary`);
            setTimelineModal({ patient: p, steps: r.data.steps });
        } catch { setTimelineModal({ patient: p, steps: [] }); }
    };

    const openPatient = (p) => {
        setSelected(p);
        setNotes({ diagnosis: p.diagnosis || "", treatment_notes: p.treatment_notes || "", status: p.status || "" });
    };

    const saveNotes = async () => {
        if (!selected) return;
        try {
            await ax().patch(`/patients/${selected.patient_code}`, notes);
            showToast("✅ Treatment notes saved");
            fetchAll(); setSelected(null);
        } catch (e) {
            showToast("❌ " + (e?.response?.data?.detail || "Error"));
        }
    };

    const markConsultationDone = async () => {
        if (!selected) return;
        try {
            await ax().post(`/patients/${selected.patient_code}/doctor/consultation-done`);
            showToast("✅ Consultation marked as done");
            fetchAll(); setSelected(null);
        } catch (e) { showToast("❌ Error"); }
    };

    const markReportReviewed = async () => {
        if (!selected) return;
        try {
            await ax().post(`/patients/${selected.patient_code}/doctor/report-reviewed`);
            showToast("✅ Lab Report marked as reviewed");
            fetchAll(); setSelected(null);
        } catch (e) { showToast("❌ Error"); }
    };

    const triggerPrescribeLab = async () => {
        if (!selected) return;
        try {
            await ax().post(`/patients/${selected.patient_code}/doctor/prescribe-lab`);
            showToast("✅ Lab Test prescribed (Awaiting Nurse)");
            fetchAll(); setSelected(null);
        } catch (e) { showToast("❌ Error"); }
    };

    const prescribeMedicine = async () => {
        if (!prescribe.patient_id || !prescribe.medicine) return;
        try {
            await ax().post("/pharmacy/prescribe", [{
                patient_id: +prescribe.patient_id,
                medicine_name: prescribe.medicine,
                dosage: prescribe.dosage || "1-0-1",
                duration: prescribe.duration || "5 Days"
            }]);
            showToast(`✅ Medicine prescribed`);
            setPrescribe({ patient_id: "", medicine: "", dosage: "", duration: "" }); fetchAll();
        } catch (e) {
            showToast("❌ " + (e?.response?.data?.detail || "Error"));
        }
    };

    const resolveTicket = async (ticketId, notes) => {
        try {
            await ax().patch(`/tickets/${ticketId}/resolve`, { status: "RESOLVED", notes });
            showToast("✅ Ticket resolved");
            fetchAll();
        } catch { }
    };

    const TABS = [
        { id: "patients", label: "👥 My Patients" },
        { id: "prescribe", label: "💊 Prescribe Medicine" },
        { id: "tickets", label: `📩 Tickets ${tickets.filter(t => t.status !== "RESOLVED").length ? `(${tickets.filter(t => t.status !== "RESOLVED").length})` : ""}` },
        { id: "lab", label: "🔬 Lab Tasks" },
    ];

    return (
        <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: C.text }}>
            {toast && (
                <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "rgba(0,212,255,0.12)", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 20px", color: C.cyan, fontWeight: 600, fontSize: 13, backdropFilter: "blur(10px)" }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: `1px solid ${C.border}`, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#00d4ff,#0077ff)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0a0f1e", fontSize: 18 }}>+</div>
                    <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>MedFlow</div>
                        <div style={{ color: C.sub, fontSize: 11 }}>Doctor Dashboard</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                        <div style={{ color: C.cyan, fontSize: 11 }}>👨‍⚕️ Doctor</div>
                    </div>
                    <button onClick={onLogout} style={{ padding: "8px 16px", background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 9, color: "#ff6b6b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, padding: "18px 32px 0", borderBottom: `1px solid ${C.border}` }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, borderRadius: "10px 10px 0 0",
                        background: tab === t.id ? "rgba(0,212,255,0.12)" : "transparent",
                        color: tab === t.id ? C.cyan : C.sub,
                        borderBottom: tab === t.id ? `2px solid ${C.cyan}` : "2px solid transparent",
                    }}>{t.label}</button>
                ))}
            </div>

            <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

                {/* ── MY PATIENTS ── */}
                {tab === "patients" && (
                    <>
                        <h2 style={{ color: "#fff", marginBottom: 20, fontWeight: 700 }}>My Assigned Patients ({patients.length})</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
                            {patients.map(p => (
                                <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                        <div>
                                            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                                            <div style={{ color: C.sub, fontSize: 12 }}>{p.patient_code} · {p.gender}, {p.age}y</div>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                                            {badge(statusColor[p.status] || "#888", p.status)}
                                            {p.priority === "EMERGENCY" && badge("#ef4444", "⚠ EMERGENCY")}
                                        </div>
                                    </div>
                                    <div style={{ color: C.sub, fontSize: 12, marginBottom: 12 }}>📋 {p.complaint}</div>
                                    {p.diagnosis && <div style={{ color: "#a3e635", fontSize: 12, marginBottom: 6 }}>🩺 <strong>Diagnosis:</strong> {p.diagnosis}</div>}
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button onClick={() => openPatient(p)} style={{ padding: "8px 14px", background: "rgba(0,212,255,0.1)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cyan, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                            Update Notes →
                                        </button>
                                        <button onClick={() => openTimeline(p)} style={{ padding: "8px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 9, color: "#22c55e", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                            📋 Timeline
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {patients.length === 0 && <div style={{ color: C.sub }}>No patients assigned yet.</div>}
                        </div>
                    </>
                )}

                {/* ── PRESCRIBE MEDICINE ── */}
                {tab === "prescribe" && (
                    <div style={{ maxWidth: 520 }}>
                        <h2 style={{ color: "#fff", marginBottom: 20 }}>💊 Prescribe Medicine</h2>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                            <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>PATIENT</label>
                            <select
                                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, marginBottom: 16 }}
                                value={prescribe.patient_id}
                                onChange={e => setPrescribe(p => ({ ...p, patient_id: e.target.value }))}
                            >
                                <option value="">Select patient...</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.patient_code} — {p.name}</option>)}
                            </select>

                            <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>MEDICINE NAME</label>
                            <input
                                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, marginBottom: 16, boxSizing: "border-box" }}
                                placeholder="e.g. Paracetamol 500mg"
                                value={prescribe.medicine}
                                onChange={e => setPrescribe(p => ({ ...p, medicine: e.target.value }))}
                            />

                            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>DOSAGE</label>
                                    <input
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, boxSizing: "border-box" }}
                                        placeholder="e.g. 1-0-1"
                                        value={prescribe.dosage}
                                        onChange={e => setPrescribe(p => ({ ...p, dosage: e.target.value }))}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>DURATION</label>
                                    <input
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, boxSizing: "border-box" }}
                                        placeholder="e.g. 5 Days"
                                        value={prescribe.duration}
                                        onChange={e => setPrescribe(p => ({ ...p, duration: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <button onClick={prescribeMedicine} style={{ padding: "11px 24px", background: "linear-gradient(135deg,#00d4ff,#0077ff)", border: "none", borderRadius: 10, color: "#0a0f1e", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" }}>
                                Prescribe Medicine →
                            </button>
                        </div>

                        {/* Recent lab tasks */}
                        <h3 style={{ color: "#fff", marginTop: 28, marginBottom: 14 }}>Recent Lab Tasks ({labTasks.length})</h3>
                        {labTasks.map(l => (
                            <div key={l.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{l.report_code} — {l.test_type}</div>
                                    <div style={{ color: C.sub, fontSize: 11 }}>Patient #{l.patient_id}</div>
                                </div>
                                {badge(statusColor[l.status] || "#888", l.status)}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── TICKETS ── */}
                {tab === "tickets" && (
                    <>
                        <h2 style={{ color: "#fff", marginBottom: 20 }}>📩 Assigned Tickets</h2>
                        {tickets.map(t => (
                            <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{t.ticket_code} — {t.department}</div>
                                        <div style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>{t.query_text}</div>
                                    </div>
                                    {badge(ticketColor[t.status] || "#888", t.status)}
                                </div>
                                <div style={{ color: C.sub, fontSize: 11, marginTop: 8 }}>Created: {new Date(t.created_at).toLocaleString()}</div>
                                {t.status !== "RESOLVED" && (
                                    <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                                        <input
                                            placeholder="Resolution notes..."
                                            style={{ flex: 1, padding: "8px 12px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 12 }}
                                            value={ticketNotes[t.id] || ""}
                                            onChange={e => setTicketNotes(n => ({ ...n, [t.id]: e.target.value }))}
                                        />
                                        <button onClick={() => resolveTicket(t.id, ticketNotes[t.id])}
                                            style={{ padding: "8px 14px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 9, color: "#22c55e", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                                            ✓ Resolve
                                        </button>
                                    </div>
                                )}
                                {t.status === "RESOLVED" && <div style={{ color: "#22c55e", fontSize: 12, marginTop: 8 }}>✅ Resolved · {t.resolved_at ? new Date(t.resolved_at).toLocaleString() : ""}</div>}
                            </div>
                        ))}
                        {tickets.length === 0 && <div style={{ color: C.sub }}>No tickets assigned to you.</div>}
                    </>
                )}

                {/* ── LAB TASKS ── */}
                {tab === "lab" && (
                    <>
                        <h2 style={{ color: "#fff", marginBottom: 20 }}>🔬 Lab Tasks Overview ({labTasks.length})</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                            {labTasks.map(l => (
                                <div key={l.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ color: "#fff", fontWeight: 700 }}>{l.report_code}</div>
                                        {badge(statusColor[l.status] || "#888", l.status)}
                                    </div>
                                    <div style={{ color: C.sub, fontSize: 12 }}>🧪 {l.test_type}</div>
                                    <div style={{ color: C.sub, fontSize: 12 }}>👤 Patient #{l.patient_id}</div>
                                    {l.notes && <div style={{ color: "#a3e635", fontSize: 12, marginTop: 6 }}>📝 {l.notes}</div>}
                                    {l.file_path && (
                                        <a href={`http://localhost:8000/uploads/${l.file_path.split("/").pop()}`} target="_blank" rel="noreferrer"
                                            style={{ display: "inline-block", marginTop: 10, color: C.cyan, fontSize: 12, textDecoration: "underline" }}>
                                            📄 View Report
                                        </a>
                                    )}
                                </div>
                            ))}
                            {labTasks.length === 0 && <div style={{ color: C.sub }}>No lab tasks yet.</div>}
                        </div>
                    </>
                )}
            </div>

            {/* Patient notes modal */}
            {selected && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, backdropFilter: "blur(8px)" }}>
                    <div style={{ background: "#0e1526", border: `1px solid ${C.border}`, borderRadius: 20, padding: 32, width: 480, maxHeight: "80vh", overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                            <div style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>Update: {selected.name}</div>
                            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.sub, fontSize: 20, cursor: "pointer" }}>✕</button>
                        </div>
                        <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>DIAGNOSIS</label>
                        <textarea style={{ width: "100%", minHeight: 80, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, marginBottom: 14, resize: "vertical", boxSizing: "border-box" }}
                            placeholder="Enter diagnosis..." value={notes.diagnosis} onChange={e => setNotes(n => ({ ...n, diagnosis: e.target.value }))} />
                        <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>TREATMENT NOTES</label>
                        <textarea style={{ width: "100%", minHeight: 80, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, marginBottom: 14, resize: "vertical", boxSizing: "border-box" }}
                            placeholder="Enter treatment notes..." value={notes.treatment_notes} onChange={e => setNotes(n => ({ ...n, treatment_notes: e.target.value }))} />
                        <label style={{ color: C.sub, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>STATUS</label>
                        <select style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13, marginBottom: 20 }}
                            value={notes.status} onChange={e => setNotes(n => ({ ...n, status: e.target.value }))} disabled>
                            <option value={notes.status}>{notes.status}</option>
                        </select>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
                            <button onClick={saveNotes} style={{ padding: "10px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, color: C.cyan, fontWeight: 700, cursor: "pointer" }}>Save Notes Only</button>
                            <button onClick={markConsultationDone} style={{ padding: "10px 16px", background: "linear-gradient(135deg,#00d4ff,#0077ff)", border: "none", borderRadius: 10, color: "#0a0f1e", fontWeight: 700, cursor: "pointer" }}>✓ Mark Consultation Done</button>
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                            {selected.status === "DOCTOR_REVIEW_PENDING" && (
                                <button onClick={markReportReviewed} style={{ padding: "10px 16px", background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", borderRadius: 10, color: "#0a0f1e", fontWeight: 700, cursor: "pointer" }}>✅ Mark Report Reviewed</button>
                            )}
                            <button onClick={triggerPrescribeLab} style={{ padding: "10px 16px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>🧪 Prescribe Lab Test</button>
                            <button onClick={() => { setTab("prescribe"); setPrescribe(p => ({ ...p, patient_id: selected.id })); setSelected(null); }} style={{ padding: "10px 16px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}>💊 Prescribe Medicine</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Timeline Modal ── */}
            {timelineModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", zIndex: 600, backdropFilter: "blur(6px)" }}
                    onClick={() => setTimelineModal(null)}>
                    <div style={{ width: 400, height: "100vh", background: "#0e1526", borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: 32 }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                            <div>
                                <div style={{ color: C.cyan, fontFamily: "monospace", fontWeight: 700 }}>{timelineModal.patient.patient_code}</div>
                                <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{timelineModal.patient.name}</div>
                                <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>Workflow Timeline (read-only)</div>
                            </div>
                            <button onClick={() => setTimelineModal(null)} style={{ background: "none", border: "none", color: C.sub, fontSize: 22, cursor: "pointer" }}>✕</button>
                        </div>
                        {timelineModal.steps === null && <div style={{ color: C.cyan, fontFamily: "monospace", fontSize: 12 }}>Loading…</div>}
                        {timelineModal.steps && timelineModal.steps.length === 0 && <div style={{ color: C.sub }}>No timeline events yet.</div>}
                        {timelineModal.steps && timelineModal.steps.map((step, idx) => {
                            const cm = COLOR_MAP[step.color_code] || COLOR_MAP.YELLOW;
                            return (
                                <div key={idx} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: cm.text, border: `2px solid ${cm.border}`, flexShrink: 0, marginTop: 3 }} />
                                        {idx < timelineModal.steps.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e2d4a", marginTop: 3 }} />}
                                    </div>
                                    <div style={{ paddingBottom: 12 }}>
                                        <div style={{ color: "#e2eaf5", fontWeight: 600, fontSize: 13 }}>{step.action}</div>
                                        {step.actor_name && <div style={{ color: C.sub, fontSize: 11 }}>by {step.actor_name}</div>}
                                        <div style={{ color: "#4a6a8a", fontSize: 11 }}>{new Date(step.timestamp).toLocaleString()}</div>
                                        <span style={{ background: cm.bg, border: `1px solid ${cm.border}`, color: cm.text, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, display: "inline-block", marginTop: 4 }}>{step.status || step.ref_type}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
