import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const token = () => localStorage.getItem("token");
const hdr = () => ({ Authorization: `Bearer ${token()}` });

const PRIORITY_COLOR = { NORMAL: "#22c55e", EMERGENCY: "#ef4444" };
const STATUS_MAP = {
    PENDING: ["#64748b", "Pending"],
    IN_PROGRESS: ["#f59e0b", "In Progress"],
    COMPLETED: ["#22c55e", "Completed"],
    DOCTOR_VISITED: ["#00d4ff", "Doctor Visited"],
    LAB_PENDING: ["#a855f7", "Lab Pending"],
    LAB_COMPLETED: ["#22c55e", "Lab Completed"],
    PHARMACY_PENDING: ["#f97316", "Pharmacy Pending"],
    BILLING_PENDING: ["#ec4899", "Billing Pending"],
    BILL_PAID: ["#22c55e", "Bill Paid"],
    DISCHARGED: ["#22c55e", "Discharged ✓"],
};

const TEST_OPTIONS = [
    "Blood Test (CBC)", "Blood Sugar (FBS)", "Blood Sugar (RBS)", "Urine Test",
    "X-Ray (Chest)", "X-Ray (Bone)", "ECG", "Echo Cardiogram",
    "MRI Brain", "CT Scan", "Liver Function Test", "Kidney Function Test",
    "Thyroid Profile", "Lipid Profile", "Dengue Test", "Malaria Test",
    "COVID RT-PCR", "Urine Culture", "Stool Test", "Pregnancy Test",
];

function StatusBadge({ status }) {
    const [color, label] = STATUS_MAP[status] || ["#64748b", status];
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            color, background: `${color}18`, border: `1px solid ${color}44`,
            fontFamily: "monospace",
        }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
            {label}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const p = (priority || "NORMAL").toUpperCase();
    const color = PRIORITY_COLOR[p] || "#22c55e";
    return (
        <span style={{
            fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
            color, background: `${color}15`, border: `1px solid ${color}33`, fontFamily: "monospace",
        }}>
            {p === "EMERGENCY" ? "🚨 " : ""}{p}
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
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)", maxWidth: 360,
        }}>
            {msg}
        </div>
    );
}

// ── Action Panels ─────────────────────────────────────────────────────────────

function MarkDoctorVisited({ patient, onDone, showToast }) {
    const [loading, setLoading] = useState(false);
    const handle = async () => {
        setLoading(true);
        try {
            await axios.post(`${API}/nurse/${patient.patient_code}/mark-doctor-visited`, {}, { headers: hdr() });
            showToast("✅ Doctor visit marked successfully!");
            onDone();
        } catch (e) { showToast(e.response?.data?.detail || "Failed", true); }
        finally { setLoading(false); }
    };
    return (
        <div style={{ padding: "16px 0" }}>
            <p style={{ color: "#a0b8d0", fontSize: 13, marginBottom: 16 }}>
                Mark that Dr. {patient.doctor_name || "Doctor"} has visited and consulted this patient.
            </p>
            <button onClick={handle} disabled={loading} style={{
                padding: "12px 28px", borderRadius: 10, background: "linear-gradient(135deg,#00d4ff,#0099bb)",
                color: "#060b14", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                opacity: loading ? 0.7 : 1,
            }}>
                {loading ? "Marking..." : "✅ Mark Doctor Visited"}
            </button>
        </div>
    );
}

function AddLabTests({ patient, onDone, showToast }) {
    const [selected, setSelected] = useState([]);
    const [custom, setCustom] = useState("");
    const [loading, setLoading] = useState(false);

    const toggleTest = (t) => setSelected(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t]);
    const addCustom = () => { if (custom.trim()) { setSelected(s => [...s, custom.trim()]); setCustom(""); } };

    const handle = async () => {
        if (selected.length === 0) { showToast("Select at least one test", true); return; }
        setLoading(true);
        try {
            await axios.post(
                `${API}/nurse/${patient.patient_code}/add-lab-tests`,
                selected.map(t => ({ test_type: t })),
                { headers: hdr() }
            );
            showToast(`✅ ${selected.length} lab test(s) added!`);
            onDone();
        } catch (e) { showToast(e.response?.data?.detail || "Failed", true); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "monospace" }}>
                    Select Lab Tests
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TEST_OPTIONS.map(t => (
                        <button key={t} onClick={() => toggleTest(t)} style={{
                            padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            background: selected.includes(t) ? "rgba(168,85,247,0.2)" : "#0d1526",
                            color: selected.includes(t) ? "#a855f7" : "#5a7aa0",
                            border: `1px solid ${selected.includes(t) ? "#a855f744" : "#1e2d4a"}`,
                            transition: "all 0.15s",
                        }}>
                            {selected.includes(t) ? "✓ " : ""}{t}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                    value={custom} onChange={e => setCustom(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustom()}
                    placeholder="Custom test name..."
                    style={{ flex: 1, background: "#060b14", border: "1px solid #1e2d4a", color: "#fff", padding: "10px 14px", borderRadius: 8, outline: "none", fontSize: 13 }}
                />
                <button onClick={addCustom} style={{ padding: "10px 16px", borderRadius: 8, background: "#a855f722", border: "1px solid #a855f733", color: "#a855f7", cursor: "pointer", fontWeight: 700 }}>
                    + Add
                </button>
            </div>

            {selected.length > 0 && (
                <div style={{ background: "#060b14", border: "1px solid #1e2d4a", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#4a6a8a", marginBottom: 8, fontFamily: "monospace", textTransform: "uppercase" }}>
                        Selected ({selected.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {selected.map(t => (
                            <span key={t} style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "4px 12px", borderRadius: 20, background: "rgba(168,85,247,0.1)",
                                border: "1px solid #a855f733", color: "#a855f7", fontSize: 12,
                            }}>
                                🧪 {t}
                                <button onClick={() => setSelected(s => s.filter(x => x !== t))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <button onClick={handle} disabled={loading || selected.length === 0} style={{
                padding: "12px 28px", borderRadius: 10, background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                opacity: loading || selected.length === 0 ? 0.5 : 1,
            }}>
                {loading ? "Sending..." : `🧪 Send ${selected.length} Test(s) to Lab`}
            </button>
        </div>
    );
}

const COMMON_MEDS = [
    { drug_name: "Paracetamol", dosage: "500mg", frequency: "3x daily", duration: "3 days", price: "50" },
    { drug_name: "Amoxicillin", dosage: "250mg", frequency: "2x daily", duration: "5 days", price: "80" },
    { drug_name: "Ibuprofen", dosage: "400mg", frequency: "2x daily", duration: "3 days", price: "60" },
    { drug_name: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "5 days", price: "40" },
    { drug_name: "Omeprazole", dosage: "20mg", frequency: "Once daily", duration: "7 days", price: "70" },
    { drug_name: "Azithromycin", dosage: "500mg", frequency: "Once daily", duration: "3 days", price: "120" },
];

function AddMedication({ patient, onDone, showToast }) {
    const [meds, setMeds] = useState([{ drug_name: "", dosage: "", frequency: "", duration: "", price: "0" }]);
    const [loading, setLoading] = useState(false);

    const addRow = () => setMeds(m => [...m, { drug_name: "", dosage: "", frequency: "", duration: "", price: "0" }]);
    const rmRow = (i) => setMeds(m => m.filter((_, idx) => idx !== i));
    const upd = (i, k, v) => setMeds(m => m.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
    const fillCommon = (preset) => setMeds(m => [...m.filter(r => r.drug_name), { ...preset }]);

    const handle = async () => {
        const valid = meds.filter(m => m.drug_name.trim());
        if (!valid.length) { showToast("Add at least one medication", true); return; }
        setLoading(true);
        try {
            await axios.post(
                `${API}/nurse/${patient.patient_code}/prescribe-medication`,
                { medications: valid },
                { headers: hdr() }
            );
            showToast("✅ Medication prescribed! Sent to Pharmacy.");
            onDone();
        } catch (e) { showToast(e.response?.data?.detail || "Failed", true); }
        finally { setLoading(false); }
    };

    return (
        <div>
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#4a6a8a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "monospace" }}>
                    Quick Add Common Medicines
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {COMMON_MEDS.map(med => (
                        <button key={med.drug_name} onClick={() => fillCommon(med)} style={{
                            padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                            color: "#f59e0b", transition: "all 0.15s",
                        }}>
                            + {med.drug_name}
                        </button>
                    ))}
                </div>
            </div>

            {meds.map((m, i) => (
                <div key={i} style={{
                    background: "#060b14", border: "1px solid #1e2d4a", borderRadius: 10,
                    padding: "14px 16px", marginBottom: 10, display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 32px", gap: 10, alignItems: "center",
                }}>
                    <input value={m.drug_name} onChange={e => upd(i, "drug_name", e.target.value)}
                        placeholder="Medicine Name *" style={{ background: "#0d1526", border: "1px solid #1e2d4a", color: "#fff", padding: "8px 12px", borderRadius: 7, outline: "none", fontSize: 13 }} />
                    <input value={m.dosage} onChange={e => upd(i, "dosage", e.target.value)}
                        placeholder="Dosage" style={{ background: "#0d1526", border: "1px solid #1e2d4a", color: "#fff", padding: "8px 12px", borderRadius: 7, outline: "none", fontSize: 13 }} />
                    <input value={m.frequency} onChange={e => upd(i, "frequency", e.target.value)}
                        placeholder="Frequency" style={{ background: "#0d1526", border: "1px solid #1e2d4a", color: "#fff", padding: "8px 12px", borderRadius: 7, outline: "none", fontSize: 13 }} />
                    <input value={m.duration} onChange={e => upd(i, "duration", e.target.value)}
                        placeholder="Duration" style={{ background: "#0d1526", border: "1px solid #1e2d4a", color: "#fff", padding: "8px 12px", borderRadius: 7, outline: "none", fontSize: 13 }} />
                    <input value={m.price} onChange={e => upd(i, "price", e.target.value)}
                        placeholder="₹" type="number" style={{ background: "#0d1526", border: "1px solid #1e2d4a", color: "#f59e0b", padding: "8px 10px", borderRadius: 7, outline: "none", fontSize: 13 }} />
                    {meds.length > 1 && (
                        <button onClick={() => rmRow(i)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", padding: "8px", borderRadius: 7, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                    )}
                </div>
            ))}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button onClick={addRow} style={{
                    padding: "10px 20px", borderRadius: 9, background: "transparent",
                    border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 700,
                }}>
                    + Add Row
                </button>
                <button onClick={handle} disabled={loading} style={{
                    padding: "10px 24px", borderRadius: 9, background: "linear-gradient(135deg,#f59e0b,#d97706)",
                    color: "#000", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer",
                    opacity: loading ? 0.7 : 1,
                }}>
                    {loading ? "Sending..." : "💊 Send to Pharmacy"}
                </button>
            </div>
        </div>
    );
}

function DischargePatient({ patient, onDone, showToast }) {
    const [loading, setLoading] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const handle = async () => {
        setLoading(true);
        try {
            await axios.post(`${API}/nurse/${patient.patient_code}/discharge`, {}, { headers: hdr() });
            showToast("✅ Patient discharged successfully!");
            onDone();
        } catch (e) { showToast(e.response?.data?.detail || "Failed", true); }
        finally { setLoading(false); }
    };

    return (
        <div style={{ padding: "16px 0" }}>
            <p style={{ color: "#a0b8d0", fontSize: 13, marginBottom: 16 }}>
                This will mark the patient as discharged and complete the hospital workflow.
                Ensure billing is cleared before discharging.
            </p>
            {!confirm ? (
                <button onClick={() => setConfirm(true)} style={{
                    padding: "12px 28px", borderRadius: 10, background: "rgba(239,68,68,0.1)",
                    color: "#ef4444", fontWeight: 800, fontSize: 14, border: "1px solid rgba(239,68,68,0.35)", cursor: "pointer",
                }}>
                    🚪 Discharge Patient
                </button>
            ) : (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: 16 }}>
                    <p style={{ color: "#ef4444", fontWeight: 700, marginBottom: 12 }}>⚠️ Confirm discharge for {patient.name}?</p>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={handle} disabled={loading} style={{ padding: "10px 22px", borderRadius: 8, background: "#ef4444", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                            {loading ? "..." : "Yes, Discharge"}
                        </button>
                        <button onClick={() => setConfirm(false)} style={{ padding: "10px 22px", borderRadius: 8, background: "transparent", color: "#5a7aa0", border: "1px solid #1e2d4a", cursor: "pointer", fontWeight: 700 }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Nurse Dashboard ───────────────────────────────────────────────────────

const ACTIONS = [
    { id: "visit", label: "Mark Doctor Visited", icon: "🩺", color: "#00d4ff" },
    { id: "lab", label: "Add Lab Tests", icon: "🧪", color: "#a855f7" },
    { id: "meds", label: "Prescribe Medication", icon: "💊", color: "#f59e0b" },
    { id: "discharge", label: "Discharge Patient", icon: "🚪", color: "#ef4444" },
];

export default function NurseDashboard({ user, onLogout }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPat, setSelectedPat] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [filter, setFilter] = useState("ALL");
    const [toast, setToast] = useState(null);
    const tkn = localStorage.getItem("token");

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API}/patients/`, { headers: { Authorization: `Bearer ${tkn}` } });
            setPatients(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const showToast = (msg, isError = false) => setToast({ msg, isError });

    const filtered = filter === "ALL" ? patients : patients.filter(p => p.status === filter);

    const openAction = (patient, action) => {
        setSelectedPat(patient);
        setActionType(action);
    };

    const closeModal = () => { setSelectedPat(null); setActionType(null); };

    const onActionDone = () => {
        closeModal();
        fetchData();
    };

    const s = {
        wrap: { minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" },
        container: { maxWidth: 1300, margin: "0 auto", padding: "32px 28px" },
        card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" },
        patCard: {
            background: "#060b14", border: "1px solid #1e2d4a", borderRadius: 14,
            padding: "20px 22px", marginBottom: 14, transition: "all 0.2s",
        },
    };

    return (
        <div style={s.wrap}>
            <Navbar user={{ full_name: user.name, role: user.role }} onLogout={onLogout} />

            <div style={s.container}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, fontWeight: 700, fontFamily: "monospace" }}>
                        Nurse Dashboard
                    </div>
                    <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800 }}>Patient Care Portal 👩‍⚕️</h1>
                    <div style={{ color: "#5a7aa0", fontSize: 14 }}>
                        Assigned Doctor: <strong style={{ color: "#f59e0b" }}>{patients[0]?.doctor_name || "—"}</strong>
                        &nbsp;·&nbsp; {patients.length} patients
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
                    {[
                        { label: "Total", value: patients.length, color: "#00d4ff" },
                        { label: "Pending", value: patients.filter(p => p.status === "PENDING").length, color: "#64748b" },
                        { label: "In Progress", value: patients.filter(p => ["IN_PROGRESS", "DOCTOR_VISITED", "LAB_PENDING"].includes(p.status)).length, color: "#f59e0b" },
                        { label: "Lab / Pharmacy", value: patients.filter(p => ["LAB_PENDING", "LAB_COMPLETED", "PHARMACY_PENDING"].includes(p.status)).length, color: "#a855f7" },
                        { label: "Discharged", value: patients.filter(p => p.status === "DISCHARGED").length, color: "#22c55e" },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            background: "#0d1526", border: "1px solid rgba(0,212,255,0.08)",
                            borderRadius: 14, padding: "18px 16px", textAlign: "center",
                        }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: "monospace" }}>{stat.value}</div>
                            <div style={{ fontSize: 12, color: "#5a7aa0", marginTop: 2 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {["ALL", "PENDING", "IN_PROGRESS", "DOCTOR_VISITED", "LAB_PENDING", "PHARMACY_PENDING", "DISCHARGED"].map(st => (
                        <button key={st} onClick={() => setFilter(st)} style={{
                            padding: "8px 16px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: filter === st ? "#f59e0b22" : "#0d1526",
                            border: `1px solid ${filter === st ? "#f59e0b44" : "#1e2d4a"}`,
                            color: filter === st ? "#f59e0b" : "#5a7aa0", transition: "0.15s",
                        }}>
                            {st.replace(/_/g, " ")}
                        </button>
                    ))}
                </div>

                {/* Patient Cards */}
                {loading ? (
                    <div style={{ color: "#f59e0b", fontFamily: "monospace", textAlign: "center", padding: 60 }}>Loading patients...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ ...s.card, textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                        <div>No patients in this filter</div>
                    </div>
                ) : (
                    filtered.map(p => (
                        <div key={p.id} style={s.patCard}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "center" }}>
                                {/* Info */}
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontFamily: "monospace", color: "#00d4ff", fontWeight: 700, fontSize: 14 }}>{p.patient_code}</span>
                                        <PriorityBadge priority={p.priority} />
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                                    <div style={{ fontSize: 12, color: "#4a6a8a" }}>{p.age}y · {p.gender} · {p.specialization_required}</div>
                                </div>

                                {/* Complaint + Status */}
                                <div>
                                    <div style={{ fontSize: 11, color: "#4a6a8a", marginBottom: 4, textTransform: "uppercase", fontFamily: "monospace" }}>Complaint</div>
                                    <div style={{ fontSize: 13, color: "#a0b8d0", fontStyle: "italic", marginBottom: 8 }}>"{p.complaint}"</div>
                                    <StatusBadge status={p.status} />
                                </div>

                                {/* Doctor */}
                                <div>
                                    <div style={{ fontSize: 11, color: "#4a6a8a", marginBottom: 4, textTransform: "uppercase", fontFamily: "monospace" }}>Assigned Doctor</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>👨‍⚕️ {p.doctor_name || "—"}</div>
                                    {p.nurse_name && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 3 }}>👩‍⚕️ {p.nurse_name}</div>}
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {ACTIONS.map(act => {
                                        const disabled = p.status === "DISCHARGED" && act.id !== "discharge";
                                        return (
                                            <button key={act.id} onClick={() => openAction(p, act.id)}
                                                disabled={disabled}
                                                style={{
                                                    padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                                                    background: `${act.color}15`, border: `1px solid ${act.color}44`,
                                                    color: act.color, cursor: disabled ? "not-allowed" : "pointer",
                                                    opacity: disabled ? 0.4 : 1, transition: "0.15s", whiteSpace: "nowrap",
                                                }}>
                                                {act.icon} {act.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Action Modal */}
            {selectedPat && actionType && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000, backdropFilter: "blur(10px)", padding: 20,
                }}>
                    <div style={{
                        background: "#0d1526", border: "1px solid #1e2d4a",
                        borderRadius: 20, padding: 32, width: "100%", maxWidth: 720,
                        maxHeight: "90vh", overflowY: "auto",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                            <div>
                                <div style={{ fontSize: 11, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace", marginBottom: 4 }}>
                                    {ACTIONS.find(a => a.id === actionType)?.label}
                                </div>
                                <h2 style={{ margin: 0, fontSize: 22 }}>{selectedPat.name}</h2>
                                <div style={{ fontSize: 13, color: "#5a7aa0", marginTop: 4 }}>
                                    {selectedPat.patient_code} · {selectedPat.complaint}
                                </div>
                            </div>
                            <button onClick={closeModal} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 26, cursor: "pointer", fontWeight: 900 }}>×</button>
                        </div>

                        {actionType === "visit" && <MarkDoctorVisited patient={selectedPat} onDone={onActionDone} showToast={showToast} />}
                        {actionType === "lab" && <AddLabTests patient={selectedPat} onDone={onActionDone} showToast={showToast} />}
                        {actionType === "meds" && <AddMedication patient={selectedPat} onDone={onActionDone} showToast={showToast} />}
                        {actionType === "discharge" && <DischargePatient patient={selectedPat} onDone={onActionDone} showToast={showToast} />}
                    </div>
                </div>
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </div>
    );
}
