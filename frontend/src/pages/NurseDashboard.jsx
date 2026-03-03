import React, { useState, useEffect } from "react";
import { authAxios } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const PRIORITY_COLOR = { NORMAL: "#22c55e", URGET: "#f59e0b", EMERGENCY: "#ef4444" };
const STATUS_MAP = {
    PENDING: ["#64748b", "Pending Admission"],
    IN_PROGRESS: ["#f59e0b", "Admitted"],
    DOCTOR_VISITED: ["#00d4ff", "Doctor Visited"],
    LAB_PENDING: ["#a855f7", "Lab Pending"],
    LAB_COMPLETED: ["#10b981", "Lab Results Ready"],
    PHARMACY_PENDING: ["#f97316", "Pharmacy Needed"],
    BILLING_PENDING: ["#ec4899", "Awaiting Billing"],
    BILL_PAID: ["#10b981", "Bill Paid"],
    DISCHARGE_PENDING: ["#ef4444", "Ready for Discharge"],
    DISCHARGED: ["#10b981", "Discharged ✓"],
};

const TEST_OPTIONS = [
    "Blood Test (CBC)", "Blood Sugar (FBS)", "Blood Sugar (RBS)", "Urine Test",
    "X-Ray (Chest)", "X-Ray (Bone)", "ECG", "Echo Cardiogram",
    "MRI Brain", "CT Scan", "Liver Function Test", "Kidney Function Test",
    "Thyroid Profile", "Lipid Profile", "Dengue Test", "Malaria Test",
    "COVID RT-PCR", "Urine Culture", "Stool Test", "Pregnancy Test",
];

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

function TimelinePanel({ patientId }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        authAxios().get(`/movement-logs/patient/${patientId}/summary`)
            .then(r => setData(r.data))
            .catch(() => setData({ steps: [] }));
    }, [patientId]);

    if (!data) return <div style={{ color: "#00d4ff", fontSize: 12, padding: 12 }}>Loading timeline…</div>;

    return (
        <div style={{ padding: 24, background: "rgba(0,0,0,0.2)", borderTop: "1px solid #1e2d4a" }}>
            <h4 style={{ margin: "0 0 16px", fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: 1.2 }}>Workflow Timeline</h4>
            {data.steps.map((step, idx) => {
                const cm = BOARD_COLORS[step.color_code] || BOARD_COLORS.YELLOW;
                return (
                    <div key={idx} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cm.text, flexShrink: 0, marginTop: 4 }} />
                            {idx < data.steps.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e2d4a", marginTop: 4 }} />}
                        </div>
                        <div>
                            <div style={{ color: "#e2eaf5", fontSize: 13, fontWeight: 600 }}>{step.action}</div>
                            <div style={{ color: "#5a7aa0", fontSize: 11 }}>{new Date(step.timestamp).toLocaleString()} {step.actor_name && `· ${step.actor_name}`}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Action Components ────────────────────────────────────────────────────────
function AddLabTestsPanel({ patient, onDone, showToast }) {
    const [selected, setSelected] = useState([]);
    const [custom, setCustom] = useState("");
    const [loading, setLoading] = useState(false);

    const toggleTest = (t) => setSelected(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
    const handle = async () => {
        if (!selected.length && !custom.trim()) return showToast("Select tests", true);
        setLoading(true);
        try {
            const tests = [...selected];
            if (custom.trim()) tests.push(custom.trim());
            await authAxios().post("/lab-reports/assign", tests.map(t => ({ patient_id: patient.id, test_type: t })));
            showToast(`✅ ${tests.length} test(s) assigned to lab`);
            onDone();
        } catch { showToast("Failed to assign lab tests", true); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {TEST_OPTIONS.map(o => (
                    <button key={o} onClick={() => toggleTest(o)} style={{ padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, background: selected.includes(o) ? "rgba(168,85,247,0.2)" : "#060b14", border: `1px solid ${selected.includes(o) ? "#a855f7" : "#1e2d4a"}`, color: selected.includes(o) ? "#a855f7" : "#5a7aa0" }}>{o}</button>
                ))}
            </div>
            <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Custom test…" style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: 12, borderRadius: 8, width: "100%", outline: "none", marginBottom: 16 }} />
            <button onClick={handle} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 10, background: "#a855f7", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>{loading ? "Assigning..." : "Assign to Lab Tech"}</button>
        </div>
    );
}

function AddMedsPanel({ patient, onDone, showToast }) {
    const [meds, setMeds] = useState("");
    const [loading, setLoading] = useState(false);
    const handle = async () => {
        if (!meds.trim()) return showToast("Enter medication", true);
        setLoading(true);
        try {
            await authAxios().post("/pharmacy/prescribe", [{ patient_id: patient.id, medicine_name: meds, dosage: "As prescribed", duration: "Until finished" }]);
            showToast("✅ Medication order sent to Pharmacy");
            onDone();
        } catch { showToast("Failed to prescribe meds", true); }
        finally { setLoading(false); }
    };
    return (
        <div>
            <textarea rows={4} value={meds} onChange={e => setMeds(e.target.value)} placeholder="Enter medicines, e.g. Paracetamol 500mg (3x daily)..." style={{ background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: 12, borderRadius: 8, width: "100%", outline: "none", marginBottom: 16, resize: "none" }} />
            <button onClick={handle} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 10, background: "#f59e0b", color: "#000", fontWeight: 800, border: "none", cursor: "pointer" }}>{loading ? "Ordering..." : "Send to Pharmacy Market"}</button>
        </div>
    );
}

export default function NurseDashboard({ user, onLogout }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState("ALL");
    const [action, setAction] = useState(null);
    const [expanded, setExpanded] = useState(null);

    const showToast = (msg, isError) => { setToast({ msg, isError }); setTimeout(() => setToast(null), 3500); };

    const loadPatients = async () => {
        try {
            const res = await authAxios().get("/patients/");
            setPatients(res.data);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { loadPatients(); }, []);

    const updateStatus = async (pat, status, actionMsg) => {
        try {
            await authAxios().patch(`/patients/${pat.patient_code}`, { status });
            if (actionMsg) await authAxios().post("/movement-logs/nurse-action", { patient_id: pat.id, action: actionMsg });
            showToast(`✅ Patient marked as ${status.replace("_", " ")}`);
            loadPatients();
        } catch { showToast("Failed to update status", true); }
    };

    const filtered = patients.filter(p => filter === "ALL" || p.status === filter);

    const s = {
        wrap: { minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'Inter', sans-serif" },
        container: { maxWidth: 1100, margin: "0 auto", padding: 32 },
        card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, marginBottom: 16, overflow: "hidden" },
        btn: (bg, clr) => ({ padding: "8px 16px", borderRadius: 8, background: bg, border: "none", color: clr, fontWeight: 700, cursor: "pointer", fontSize: 12 }),
    };

    return (
        <div style={s.wrap}>
            <Navbar user={{ ...user, role: "NURSE" }} onLogout={onLogout} />

            {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, background: toast.isError ? "#ef444415" : "#00d4ff15", border: `1px solid ${toast.isError ? "#ef4444" : "#00d4ff"}44`, padding: "12px 24px", borderRadius: 12, color: toast.isError ? "#ef4444" : "#00d4ff", fontWeight: 700, backdropFilter: "blur(10px)" }}>{toast.msg}</div>}

            <div style={s.container}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Wards & Triage 👩‍⚕️</h1>
                        <p style={{ color: "#5a7aa0", marginTop: 4 }}>Track patient workflow, coordinate with doctors and departments.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {["ALL", "PENDING", "IN_PROGRESS", "LAB_PENDING", "PHARMACY_PENDING"].map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 12px", borderRadius: 20, fontSize: 11, background: filter === f ? "#00d4ff15" : "#0d1526", border: `1px solid ${filter === f ? "#00d4ff" : "#1e2d4a"}`, color: filter === f ? "#00d4ff" : "#5a7aa0", cursor: "pointer", fontWeight: 700 }}>{f.replace("_", " ")}</button>
                        ))}
                    </div>
                </div>

                {loading ? <div style={{ color: "#00d4ff", textAlign: "center", padding: 80 }}>Accessing Secure Patient Database...</div> : filtered.map(p => (
                    <div key={p.id} style={s.card}>
                        <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 24, alignItems: "center" }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontFamily: "monospace", color: "#00d4ff", fontWeight: 700, fontSize: 13 }}>{p.patient_code}</span>
                                    <PriorityBadge priority={p.priority} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: 18 }}>{p.name}</h3>
                                <div style={{ color: "#5a7aa0", fontSize: 12 }}>{p.age}y · {p.gender}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: "#4a6a8a", textTransform: "uppercase", marginBottom: 4 }}>Condition</div>
                                <div style={{ fontSize: 13, fontStyle: "italic", mb: 6 }}>"{p.complaint}"</div>
                                <StatusBadge status={p.status} />
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {p.status === "PENDING" && <button onClick={() => updateStatus(p, "IN_PROGRESS", "🏥 Patient Admitted to Ward")} style={s.btn("#00d4ff", "#000")}>Admit</button>}
                                {p.status === "IN_PROGRESS" && <button onClick={() => updateStatus(p, "DOCTOR_VISITED", "🩺 Marked Doctor Consultation Done")} style={s.btn("#10b981", "#000")}>Dr. Visited</button>}
                                <button onClick={() => setAction({ type: "LAB", p })} style={s.btn("#a855f715", "#a855f7")}>+ Lab Test</button>
                                <button onClick={() => setAction({ type: "MEDS", p })} style={s.btn("#f59e0b15", "#f59e0b")}>+ Medicine</button>
                                {p.status === "DISCHARGE_PENDING" && <button onClick={() => updateStatus(p, "DISCHARGED", "🚪 Patient Checked Out")} style={s.btn("#ef4444", "#fff")}>Checked Out</button>}
                            </div>
                            <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} style={{ background: "none", border: "none", color: "#5a7aa0", cursor: "pointer", fontSize: 20 }}>{expanded === p.id ? "▲" : "▼"}</button>
                        </div>
                        {expanded === p.id && <TimelinePanel patientId={p.id} />}
                    </div>
                ))}

                {action && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
                        <div style={{ background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 20, padding: 32, width: "100%", maxWidth: 640 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>{action.type === "LAB" ? "Assign Lab Tests" : "Prescribe Medication"}</h2>
                                    <p style={{ color: "#5a7aa0", margin: "4px 0 0" }}>Patient: {action.p.name} ({action.p.patient_code})</p>
                                </div>
                                <button onClick={() => setAction(null)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 24, cursor: "pointer" }}>×</button>
                            </div>
                            {action.type === "LAB" ? <AddLabTestsPanel patient={action.p} showToast={showToast} onDone={() => { setAction(null); loadPatients(); }} /> : <AddMedsPanel patient={action.p} showToast={showToast} onDone={() => { setAction(null); loadPatients(); }} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
