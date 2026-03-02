import React, { useState, useEffect } from "react";
import { authAxios } from "../context/AuthContext";

const PRIORITY_COLOR = { NORMAL: "#22c55e", EMERGENCY: "#ef4444" };

const COLOR_MAP = {
    RED: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#ef4444" },
    GREEN: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", text: "#22c55e" },
    YELLOW: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "#f59e0b" },
    BLUE: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#3b82f6" },
};

function StatusBadge({ status }) {
    const cfg = {
        PENDING: ["#64748b", "rgba(100,116,139,0.12)", "Pending"],
        IN_PROGRESS: ["#f59e0b", "rgba(245,158,11,0.12)", "In Progress"],
        COMPLETED: ["#22c55e", "rgba(34,197,94,0.12)", "Completed"],
    }[status] || ["#64748b", "rgba(100,116,139,0.12)", status];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg[0], background: cfg[1], border: `1px solid ${cfg[0]}33` }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg[0] }} /> {cfg[2]}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const p = priority?.toUpperCase() || "NORMAL";
    const color = PRIORITY_COLOR[p] || "#22c55e";
    return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, color, background: `${color}15`, border: `1px solid ${color}33` }}>
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

    if (!data) return <div style={{ padding: 12, color: "#00d4ff", fontSize: 12 }}>Loading…</div>;
    if (data.steps.length === 0) return <div style={{ padding: 12, color: "#5a7aa0", fontSize: 12 }}>No timeline events yet.</div>;

    return (
        <div style={{ padding: "16px 16px 0", borderTop: "1px solid #1e2d4a" }}>
            <div style={{ fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>Workflow Timeline</div>
            {data.steps.map((step, idx) => {
                const cm = COLOR_MAP[step.color_code] || COLOR_MAP.YELLOW;
                return (
                    <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cm.text, flexShrink: 0, marginTop: 3 }} />
                            {idx < data.steps.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e2d4a", marginTop: 3 }} />}
                        </div>
                        <div style={{ paddingBottom: 10 }}>
                            <div style={{ color: "#e2eaf5", fontSize: 12, fontWeight: 600 }}>{step.action}</div>
                            {step.actor_name && <div style={{ color: "#5a7aa0", fontSize: 11 }}>by {step.actor_name}</div>}
                            <div style={{ color: "#4a6a8a", fontSize: 10, marginTop: 2 }}>{new Date(step.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function NurseDashboard({ user, onLogout }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [expandedTimeline, setExpandedTimeline] = useState(null);
    const [labAssign, setLabAssign] = useState({}); // { patientId: "blood test, ecg" }
    const [toast, setToast] = useState("");

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const fetchData = async () => {
        try {
            const res = await authAxios().get("/patients/");
            setPatients(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const updateStatus = async (pcode, newStatus) => {
        try {
            await authAxios().patch(`/patients/${pcode}`, { status: newStatus });
            showToast(`✅ Status updated to ${newStatus}`);
            fetchData();
        } catch { showToast("❌ Status update failed"); }
    };

    const nurseAction = async (patientId, action) => {
        try {
            await authAxios().post("/movement-logs/nurse-action", { patient_id: patientId, action });
            showToast(`✅ Logged: ${action}`);
            fetchData();
            if (expandedTimeline === patientId) {
                setExpandedTimeline(null);
                setTimeout(() => setExpandedTimeline(patientId), 50);
            }
        } catch (err) { showToast("❌ " + (err?.response?.data?.detail || "Action failed")); }
    };

    const assignLabTests = async (p) => {
        const tests = (labAssign[p.id] || "").split(",").map(t => t.trim()).filter(Boolean);
        if (tests.length === 0) return showToast("⚠️ Enter at least one test");
        try {
            await authAxios().post("/lab-reports/assign", tests.map(t => ({ patient_id: p.id, test_type: t })));
            showToast(`✅ ${tests.length} Lab Test(s) Assigned`);
            setLabAssign(prev => ({ ...prev, [p.id]: "" }));
            fetchData();
        } catch (err) { showToast("❌ " + (err?.response?.data?.detail || "Assignment failed")); }
    };

    const filtered = patients.filter(p => filterStatus === "ALL" || p.status === filterStatus);

    const s = {
        wrap: { minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" },
        container: { maxWidth: 1100, margin: "0 auto", padding: 40 },
        card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 14, marginBottom: 16 },
        header: { display: "flex", alignContent: "center", justifyContent: "space-between", padding: "18px 32px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid #1e2d4a" },
    };

    return (
        <div style={s.wrap}>
            {/* Top Bar */}
            <div style={s.header}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: "#00d4ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800 }}>+</div>
                    <span style={{ fontWeight: 700, color: "#00d4ff", fontSize: 16 }}>MedFlow</span>
                    <span style={{ color: "#5a7aa0", fontSize: 12, marginLeft: 4 }}>/ Nurse Dashboard</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ color: "#e2eaf5", fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <button onClick={onLogout} style={{ padding: "7px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Sign Out</button>
                </div>
            </div>

            {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, padding: "12px 20px", color: "#00d4ff", fontWeight: 600, fontSize: 13 }}>{toast}</div>}

            <div style={s.container}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
                    <div>
                        <div style={{ fontSize: 11, color: "#00d4ff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Care Portal</div>
                        <h1 style={{ margin: 0, fontSize: 26 }}>My Assigned Patients</h1>
                        <div style={{ color: "#5a7aa0", fontSize: 13, marginTop: 4 }}>{filtered.length} patient(s) under your care</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(st => (
                            <button key={st} onClick={() => setFilterStatus(st)} style={{ padding: "8px 14px", borderRadius: 9, background: filterStatus === st ? "#00d4ff15" : "#0d1526", border: `1px solid ${filterStatus === st ? "#00d4ff44" : "#1e2d4a"}`, color: filterStatus === st ? "#00d4ff" : "#5a7aa0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                {st.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <div style={{ color: "#00d4ff", fontFamily: "monospace" }}>Loading patients…</div> : (
                    filtered.length === 0 ? (
                        <div style={{ ...s.card, textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                            No patients with status {filterStatus}
                        </div>
                    ) : (
                        filtered.map((p, idx) => (
                            <div key={p.id} style={{ ...s.card, position: "relative", zIndex: labAssign.open === p.id ? 100 : (filtered.length - idx) }}>
                                {/* Patient Row */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "center", padding: "18px 20px", gap: 16 }}>
                                    <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontFamily: "monospace", color: "#00d4ff", fontWeight: 700, fontSize: 13 }}>{p.patient_code}</span>
                                            <PriorityBadge priority={p.priority} />
                                        </div>
                                        <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
                                        <div style={{ fontSize: 12, color: "#4a6a8a", marginTop: 2 }}>{p.age}y · {p.gender}</div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: 11, textTransform: "uppercase", color: "#4a6a8a", marginBottom: 4 }}>Complaint</div>
                                        <div style={{ fontSize: 12, color: "#e2eaf5", fontStyle: "italic" }}>"{p.complaint}"</div>
                                        <div style={{ marginTop: 6 }}><StatusBadge status={p.status} /></div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
                                        {/* Red Alert if Lab Pending */}
                                        {p.status === "LAB_PENDING" && (
                                            <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, background: "rgba(239,68,68,0.1)", padding: "4px 8px", borderRadius: 4, marginBottom: 4 }}>
                                                🚨 Doctor Requested Lab Tests
                                            </div>
                                        )}

                                        <button onClick={() => setLabAssign(prev => ({ ...prev, open: prev.open === p.id ? null : p.id }))}
                                            style={{ padding: "8px 14px", borderRadius: 8, background: "linear-gradient(135deg,#f59e0b,#ea580c)", border: "none", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                                            🛠 Add Workflow Step {labAssign.open === p.id ? "▲" : "▼"}
                                        </button>

                                        {labAssign.open === p.id && (
                                            <div style={{ position: "absolute", top: "110%", right: 0, width: 280, background: "#060b14", border: "1px solid #1e2d4a", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8, zIndex: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>

                                                <button onClick={() => { updateStatus(p.patient_code, "IN_PROGRESS"); nurseAction(p.id, "🏥 Patient Arrived"); }}
                                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d4a", color: "#e2eaf5", padding: "8px", borderRadius: 6, fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                                                    ✔ Mark Patient Arrived
                                                </button>

                                                <button onClick={() => { updateStatus(p.patient_code, "COMPLETED"); nurseAction(p.id, "✅ Consultation Completed"); }}
                                                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d4a", color: "#e2eaf5", padding: "8px", borderRadius: 6, fontSize: 12, cursor: "pointer", textAlign: "left" }}>
                                                    ✅ Mark Consultation Completed
                                                </button>

                                                <div style={{ borderTop: "1px solid #1e2d4a", paddingTop: 8, marginTop: 4 }}>
                                                    <div style={{ fontSize: 11, color: "#4a6a8a", marginBottom: 6, fontWeight: 700 }}>ADD LAB TEST</div>
                                                    <input
                                                        placeholder="e.g. Blood Test, ECG, Scan"
                                                        style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #1e2d4a", background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 12, marginBottom: 6 }}
                                                        value={labAssign[p.id] || ""}
                                                        onChange={e => setLabAssign(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                    />
                                                    <button onClick={() => assignLabTests(p)}
                                                        style={{ width: "100%", padding: "6px 12px", borderRadius: 6, background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                        ➕ Assign Lab Technician
                                                    </button>
                                                </div>

                                                <div style={{ borderTop: "1px solid #1e2d4a", paddingTop: 8, marginTop: 4 }}>
                                                    <div style={{ fontSize: 11, color: "#4a6a8a", marginBottom: 6, fontWeight: 700 }}>ADD MEDICATION</div>
                                                    <input
                                                        placeholder="e.g. Paracetamol 1-0-1 (5 days)"
                                                        style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #1e2d4a", background: "rgba(0,0,0,0.3)", color: "#fff", fontSize: 12, marginBottom: 6 }}
                                                        value={labAssign[`med_${p.id}`] || ""}
                                                        onChange={e => setLabAssign(prev => ({ ...prev, [`med_${p.id}`]: e.target.value }))}
                                                    />
                                                    <button onClick={async () => {
                                                        const medDesc = labAssign[`med_${p.id}`] || "General Medication";
                                                        try {
                                                            await authAxios().post("/pharmacy/prescribe", [{
                                                                patient_id: p.id,
                                                                medicine_name: medDesc,
                                                                dosage: "As directed",
                                                                duration: "Until finished"
                                                            }]);
                                                            showToast("✅ Medicines sent to Pharmacy");
                                                            setLabAssign(prev => ({ ...prev, [`med_${p.id}`]: "" }));
                                                            fetchData();
                                                        } catch (err) { showToast("❌ Failed to send to Pharmacy"); }
                                                    }}
                                                        style={{ width: "100%", padding: "6px 12px", borderRadius: 6, background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                                                        ➕ Add Prescribed Medicines
                                                    </button>
                                                </div>

                                                <div style={{ borderTop: "1px solid #1e2d4a", paddingTop: 8, marginTop: 4 }}>
                                                    {p.status === "DISCHARGE_PENDING" ? (
                                                        <button onClick={() => { updateStatus(p.patient_code, "DISCHARGED"); nurseAction(p.id, "🚪 Patient Discharged by Nurse"); }}
                                                            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                                                            🏁 Mark Final Discharge
                                                        </button>
                                                    ) : (
                                                        <button onClick={async () => {
                                                            try {
                                                                await authAxios().post("/billing/generate-discharge-bill", { patient_id: p.id });
                                                                showToast("✅ Sent to Billing");
                                                                setLabAssign(prev => ({ ...prev, open: null }));
                                                                fetchData();
                                                            } catch (err) { showToast("❌ Failed to send to billing") }
                                                        }}
                                                            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                                            💳 Send to Billing
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => setExpandedTimeline(expandedTimeline === p.id ? null : p.id)}
                                        style={{ padding: "8px 14px", borderRadius: 8, background: expandedTimeline === p.id ? "#00d4ff15" : "#060b14", border: `1px solid ${expandedTimeline === p.id ? "#00d4ff44" : "#1e2d4a"}`, color: expandedTimeline === p.id ? "#00d4ff" : "#5a7aa0", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                                        {expandedTimeline === p.id ? "▲ Hide" : "📋 Timeline"}
                                    </button>
                                </div>

                                {/* Expandable Timeline */}
                                {expandedTimeline === p.id && <TimelinePanel patientId={p.id} />}
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
    );
}
