import React, { useState, useEffect } from "react";
<<<<<<< HEAD
import axios from "axios";
import { API } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const token = () => localStorage.getItem("token");
const hdr = () => ({ Authorization: `Bearer ${token()}` });

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

export default function PharmacyDashboard({ user, onLogout }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState("ALL");

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API}/pharmacy/patients`, { headers: hdr() });
            setPatients(res.data);
=======
import { authAxios } from "../context/AuthContext";

const C = {
    bg: "#060b14",
    card: "#0d1526",
    border: "#1e2d4a",
    cyan: "#00d4ff",
    blue: "#0077ff",
    text: "#e2eaf5",
    sub: "#5a7aa0",
    green: "#22c55e",
    red: "#ef4444"
};

const badge = (color, txt) => (
    <span style={{
        background: `${color}15`, border: `1px solid ${color}40`,
        color, borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700,
    }}>{txt}</span>
);

export default function PharmacyDashboard({ onLogout }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

    const fetchMeds = async () => {
        try {
            const res = await authAxios().get("/pharmacy/");
            setPrescriptions(res.data);
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

<<<<<<< HEAD
    useEffect(() => { fetchData(); }, []);

    const dispense = async (patient_code, patient_name) => {
        try {
            await axios.post(`${API}/pharmacy/dispense/${patient_code}`, {}, { headers: hdr() });
            setToast({ msg: `✅ Medications dispensed for ${patient_name}!`, isError: false });
            fetchData();
        } catch (e) {
            setToast({ msg: e.response?.data?.detail || "Failed to dispense", isError: true });
        }
    };

    const filtered = patients.filter(p => {
        if (filter === "ALL") return true;
        if (filter === "PENDING") return !p.all_dispensed;
        if (filter === "DISPENSED") return p.all_dispensed;
        return true;
    });

    const s = {
        wrap: { minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" },
        container: { maxWidth: 1200, margin: "0 auto", padding: "32px 28px" },
        card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24 },
    };

    return (
        <div style={s.wrap}>
            <Navbar user={{ full_name: user?.name || "Pharmacist", role: "PHARMACIST" }} onLogout={onLogout} />

            <div style={s.container}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 11, color: "#f97316", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, fontWeight: 700, fontFamily: "monospace" }}>
                        Pharmacy Dashboard
                    </div>
                    <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800 }}>Medication Dispensing 💊</h1>
                    <div style={{ color: "#5a7aa0", fontSize: 14 }}>
                        {patients.length} patients · {patients.filter(p => !p.all_dispensed).length} pending dispensing
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
                    {[
                        { label: "Total Patients", value: patients.length, color: "#f97316", icon: "👥" },
                        { label: "Pending Dispensing", value: patients.filter(p => !p.all_dispensed).length, color: "#f59e0b", icon: "⏳" },
                        { label: "Dispensed", value: patients.filter(p => p.all_dispensed).length, color: "#22c55e", icon: "✅" },
                    ].map(stat => (
                        <div key={stat.label} style={{ ...s.card, textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: stat.color, fontFamily: "monospace" }}>{stat.value}</div>
                            <div style={{ fontSize: 12, color: "#5a7aa0", marginTop: 2 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {["ALL", "PENDING", "DISPENSED"].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: "8px 18px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: filter === f ? "rgba(249,115,22,0.15)" : "#0d1526",
                            border: `1px solid ${filter === f ? "rgba(249,115,22,0.4)" : "#1e2d4a"}`,
                            color: filter === f ? "#f97316" : "#5a7aa0", transition: "0.15s",
                        }}>
                            {f}
                        </button>
                    ))}
                </div>

                {/* Patient Cards */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: 80, color: "#f97316", fontFamily: "monospace" }}>Loading pharmacy queue...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ ...s.card, textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
                        <div>No patients in queue</div>
                    </div>
                ) : (
                    filtered.map(pt => (
                        <div key={pt.patient_id} style={{
                            ...s.card, marginBottom: 16,
                            borderColor: pt.priority === "EMERGENCY" ? "rgba(239,68,68,0.4)" : "#1e2d4a",
                            boxShadow: pt.priority === "EMERGENCY" ? "0 0 20px rgba(239,68,68,0.1)" : "none",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                        <span style={{ fontFamily: "monospace", color: "#f97316", fontWeight: 700, fontSize: 14 }}>{pt.patient_code}</span>
                                        {pt.priority === "EMERGENCY" && (
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6, color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>🚨 EMERGENCY</span>
                                        )}
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontFamily: "monospace",
                                            color: pt.all_dispensed ? "#22c55e" : "#f59e0b",
                                            background: pt.all_dispensed ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                            border: `1px solid ${pt.all_dispensed ? "#22c55e44" : "#f59e0b44"}`,
                                        }}>
                                            {pt.all_dispensed ? "✅ DISPENSED" : "⏳ PENDING"}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{pt.patient_name}</div>
                                </div>

                                {!pt.all_dispensed && (
                                    <button onClick={() => dispense(pt.patient_code, pt.patient_name)} style={{
                                        padding: "12px 24px", borderRadius: 10, background: "linear-gradient(135deg,#f97316,#ea580c)",
                                        color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer",
                                        boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
                                    }}>
                                        ✅ Mark All Dispensed
                                    </button>
                                )}
                            </div>

                            {/* Medications Table */}
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ color: "#4a6a8a", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace" }}>
                                            {["Medicine", "Dosage", "Frequency", "Duration", "Price", "Status"].map(h => (
                                                <th key={h} style={{ padding: "8px 14px", textAlign: "left", borderBottom: "1px solid #1e2d4a" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pt.medications.map(m => (
                                            <tr key={m.id} style={{ borderBottom: "1px solid rgba(0,212,255,0.05)" }}>
                                                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#e2eaf5" }}>{m.drug_name}</td>
                                                <td style={{ padding: "12px 14px", color: "#a0b8d0", fontSize: 13 }}>{m.dosage || "—"}</td>
                                                <td style={{ padding: "12px 14px", color: "#a0b8d0", fontSize: 13 }}>{m.frequency || "—"}</td>
                                                <td style={{ padding: "12px 14px", color: "#a0b8d0", fontSize: 13 }}>{m.duration || "—"}</td>
                                                <td style={{ padding: "12px 14px", color: "#f97316", fontWeight: 700, fontFamily: "monospace" }}>₹{m.price}</td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontFamily: "monospace",
                                                        color: m.status === "DISPENSED" ? "#22c55e" : "#f59e0b",
                                                        background: m.status === "DISPENSED" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                                        border: `1px solid ${m.status === "DISPENSED" ? "#22c55e44" : "#f59e0b44"}`,
                                                    }}>
                                                        {m.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: 14, display: "flex", gap: 20 }}>
                                <div style={{ fontSize: 12, color: "#5a7aa0" }}>Total medications: <strong style={{ color: "#f97316" }}>{pt.medications.length}</strong></div>
                                <div style={{ fontSize: 12, color: "#5a7aa0" }}>
                                    Total cost: <strong style={{ color: "#f97316", fontFamily: "monospace" }}>
                                        ₹{pt.medications.reduce((s, m) => s + parseFloat(m.price || 0), 0).toFixed(0)}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
=======
    useEffect(() => { fetchMeds(); }, []);

    const dispenseMed = async (id) => {
        try {
            await authAxios().patch(`/pharmacy/${id}/dispense`);
            showToast("✅ Medicine marked as dispensed");
            fetchMeds();
        } catch (err) {
            showToast("❌ " + (err?.response?.data?.detail || "Dispense failed"));
        }
    };

    // Group by patient_id
    const grouped = prescriptions.reduce((acc, p) => {
        if (!acc[p.patient_id]) acc[p.patient_id] = { patient_code: p.patient_code, meds: [] };
        acc[p.patient_id].meds.push(p);
        return acc;
    }, {});

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
                    <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#22c55e,#16a34a)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0a0f1e", fontSize: 20 }}>+</div>
                    <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>MedFlow</div>
                        <div style={{ color: C.sub, fontSize: 11 }}>Pharmacy Dashboard</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={onLogout} style={{ padding: "8px 16px", background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 9, color: "#ff6b6b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        Sign Out
                    </button>
                </div>
            </div>

            <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ color: "#fff", margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>Pharmacy Queue</h1>
                        <div style={{ color: C.sub, fontSize: 14 }}>Prescriptions pending dispensation</div>
                    </div>
                </div>

                {loading ? <div style={{ color: C.cyan, fontFamily: "monospace" }}>Loading prescriptions...</div> : Object.keys(grouped).length === 0 ? (
                    <div style={{ textAlign: "center", padding: 80, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, color: C.sub }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>💊</div>
                        <h3 style={{ margin: 0, color: "#fff" }}>No Prescriptions</h3>
                        <p style={{ marginTop: 8 }}>The pharmacy queue is currently empty.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {Object.values(grouped).map(group => {
                            const pendingCount = group.meds.filter(m => m.status === "PENDING").length;
                            return (
                                <div key={group.patient_code} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                                    <div style={{ padding: "16px 24px", background: "rgba(0,0,0,0.2)", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Patient ID: {group.patient_code}</div>
                                            {pendingCount > 0 ? badge(C.red, `${pendingCount} Pending`) : badge(C.green, "All Dispensed")}
                                        </div>
                                    </div>
                                    <div style={{ padding: "20px 24px" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 12, color: C.sub, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                                            <div>Medicine Name</div>
                                            <div>Dosage</div>
                                            <div>Duration</div>
                                            <div>Status</div>
                                            <div style={{ textAlign: "right", width: 120 }}>Action</div>
                                        </div>
                                        {group.meds.map(med => (
                                            <div key={med.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: `1px dashed ${C.border}` }}>
                                                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{med.medicine_name}</div>
                                                <div style={{ color: C.cyan, fontSize: 13, fontFamily: "monospace" }}>{med.dosage}</div>
                                                <div style={{ color: C.text, fontSize: 13 }}>{med.duration}</div>
                                                <div>
                                                    {med.status === "PENDING" ? (
                                                        <span style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>⏳ Pending</span>
                                                    ) : (
                                                        <span style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>✅ Dispensed</span>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    {med.status === "PENDING" && (
                                                        <button onClick={() => dispenseMed(med.id)} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#00d4ff,#0077ff)", border: "none", borderRadius: 8, color: "#0a0f1e", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                                                            Dispense Output →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
        </div>
    );
}
