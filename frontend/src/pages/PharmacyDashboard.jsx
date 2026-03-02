import React, { useState, useEffect } from "react";
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
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

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
        </div>
    );
}
