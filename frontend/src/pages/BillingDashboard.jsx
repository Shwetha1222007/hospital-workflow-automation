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

export default function BillingDashboard({ user, onLogout }) {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState("ALL");
    const [selected, setSelected] = useState(null);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API}/billing/patients`, { headers: hdr() });
            setBills(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const markPaid = async (patient_code, patient_name) => {
        try {
            await axios.post(`${API}/billing/mark-paid/${patient_code}`, {}, { headers: hdr() });
            setToast({ msg: `✅ Bill payment recorded for ${patient_name}!`, isError: false });
            setSelected(null);
            fetchData();
        } catch (e) {
            setToast({ msg: e.response?.data?.detail || "Failed", isError: true });
        }
    };

    const filtered = bills.filter(b => {
        if (filter === "ALL") return true;
        if (filter === "PENDING") return b.status === "PENDING";
        if (filter === "PAID") return b.status === "PAID";
        return true;
    });

    const totalRevenue = bills.filter(b => b.status === "PAID").reduce((s, b) => s + parseFloat(b.total_fee || 0), 0);
    const pendingRevenue = bills.filter(b => b.status === "PENDING").reduce((s, b) => s + parseFloat(b.total_fee || 0), 0);

    const s = {
        wrap: { minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" },
        container: { maxWidth: 1200, margin: "0 auto", padding: "32px 28px" },
        card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24 },
    };

    return (
        <div style={s.wrap}>
            <Navbar user={{ full_name: user?.name || "Billing Staff", role: "BILLING" }} onLogout={onLogout} />

            <div style={s.container}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 11, color: "#ec4899", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4, fontWeight: 700, fontFamily: "monospace" }}>
                        Billing Dashboard
                    </div>
                    <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800 }}>Hospital Billing 💳</h1>
                    <div style={{ color: "#5a7aa0", fontSize: 14 }}>
                        {bills.length} patient bills · Revenue: <strong style={{ color: "#22c55e" }}>₹{totalRevenue.toLocaleString("en-IN")}</strong>
                        {" "}· Pending: <strong style={{ color: "#f59e0b" }}>₹{pendingRevenue.toLocaleString("en-IN")}</strong>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
                    {[
                        { label: "Total Bills", value: bills.length, color: "#ec4899", icon: "📄", format: "num" },
                        { label: "Pending Payment", value: bills.filter(b => b.status === "PENDING").length, color: "#f59e0b", icon: "⏳", format: "num" },
                        { label: "Paid Bills", value: bills.filter(b => b.status === "PAID").length, color: "#22c55e", icon: "✅", format: "num" },
                        { label: "Total Revenue", value: totalRevenue, color: "#a855f7", icon: "💰", format: "currency" },
                    ].map(stat => (
                        <div key={stat.label} style={{ ...s.card, textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
                            <div style={{ fontSize: stat.format === "currency" ? 20 : 32, fontWeight: 700, color: stat.color, fontFamily: "monospace" }}>
                                {stat.format === "currency" ? `₹${stat.value.toLocaleString("en-IN")}` : stat.value}
                            </div>
                            <div style={{ fontSize: 12, color: "#5a7aa0", marginTop: 2 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {["ALL", "PENDING", "PAID"].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: "8px 18px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                            background: filter === f ? "rgba(236,72,153,0.15)" : "#0d1526",
                            border: `1px solid ${filter === f ? "rgba(236,72,153,0.4)" : "#1e2d4a"}`,
                            color: filter === f ? "#ec4899" : "#5a7aa0", transition: "0.15s",
                        }}>
                            {f}
                        </button>
                    ))}
                </div>

                {/* Bills Table */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: 80, color: "#ec4899", fontFamily: "monospace" }}>Loading billing records...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ ...s.card, textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
                        <div>No bills found</div>
                    </div>
                ) : (
                    <div style={s.card}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ color: "#4a6a8a", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace" }}>
                                    {["Patient ID", "Patient", "Doctor Fee", "Lab Fee", "Medicine Fee", "Total", "Status", "Action"].map(h => (
                                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", borderBottom: "1px solid #1e2d4a" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(b => (
                                    <tr key={b.id}
                                        style={{ borderBottom: "1px solid rgba(0,212,255,0.05)", cursor: "pointer", transition: "0.15s" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.02)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                        onClick={() => setSelected(b)}
                                    >
                                        <td style={{ padding: "14px", fontFamily: "monospace", color: "#ec4899", fontSize: 13 }}>{b.patient_code}</td>
                                        <td style={{ padding: "14px" }}>
                                            <div style={{ fontWeight: 600 }}>{b.patient_name}</div>
                                        </td>
                                        <td style={{ padding: "14px", fontFamily: "monospace", color: "#22c55e" }}>₹{b.doctor_fee}</td>
                                        <td style={{ padding: "14px", fontFamily: "monospace", color: "#a855f7" }}>₹{b.lab_fee}</td>
                                        <td style={{ padding: "14px", fontFamily: "monospace", color: "#f97316" }}>₹{b.medicine_fee}</td>
                                        <td style={{ padding: "14px", fontFamily: "monospace", fontWeight: 800, color: "#e2eaf5", fontSize: 15 }}>
                                            ₹{b.total_fee}
                                        </td>
                                        <td style={{ padding: "14px" }}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20, fontFamily: "monospace",
                                                color: b.status === "PAID" ? "#22c55e" : "#f59e0b",
                                                background: b.status === "PAID" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                                border: `1px solid ${b.status === "PAID" ? "#22c55e44" : "#f59e0b44"}`,
                                            }}>
                                                {b.status === "PAID" ? "✅ PAID" : "⏳ PENDING"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "14px" }}>
                                            {b.status === "PENDING" && (
                                                <button onClick={e => { e.stopPropagation(); setSelected(b); }} style={{
                                                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                    background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.35)",
                                                    color: "#ec4899", cursor: "pointer",
                                                }}>
                                                    Mark Paid
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bill Detail Modal */}
            {selected && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1000, backdropFilter: "blur(10px)",
                }}>
                    <div style={{
                        background: "#0d1526", border: "1px solid rgba(236,72,153,0.3)",
                        borderRadius: 20, padding: 36, width: "100%", maxWidth: 520,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
                            <div>
                                <div style={{ fontSize: 11, color: "#ec4899", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                                    Patient Invoice
                                </div>
                                <h2 style={{ margin: 0, fontSize: 22 }}>{selected.patient_name}</h2>
                                <div style={{ color: "#5a7aa0", fontSize: 13, marginTop: 3 }}>{selected.patient_code}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 26, cursor: "pointer", fontWeight: 900 }}>×</button>
                        </div>

                        {/* Bill Breakdown */}
                        <div style={{ background: "#060b14", borderRadius: 14, padding: 22, marginBottom: 24 }}>
                            {[
                                { label: "🩺 Doctor Consultation Fee", amount: selected.doctor_fee, color: "#22c55e" },
                                { label: "🧪 Lab Tests Fee", amount: selected.lab_fee, color: "#a855f7" },
                                { label: "💊 Medication Fee", amount: selected.medicine_fee, color: "#f97316" },
                            ].map(item => (
                                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1e2d4a" }}>
                                    <span style={{ color: "#a0b8d0", fontSize: 14 }}>{item.label}</span>
                                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: item.color, fontSize: 15 }}>₹{item.amount}</span>
                                </div>
                            ))}
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0 4px" }}>
                                <span style={{ fontWeight: 800, fontSize: 16, color: "#e2eaf5" }}>TOTAL AMOUNT</span>
                                <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#ec4899", fontSize: 22 }}>₹{selected.total_fee}</span>
                            </div>
                        </div>

                        {selected.status === "PENDING" ? (
                            <button onClick={() => markPaid(selected.patient_code, selected.patient_name)} style={{
                                width: "100%", padding: "14px", borderRadius: 12,
                                background: "linear-gradient(135deg, #ec4899, #be185d)",
                                color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer",
                                boxShadow: "0 6px 20px rgba(236,72,153,0.3)",
                            }}>
                                💳 Mark as PAID
                            </button>
                        ) : (
                            <div style={{ textAlign: "center", padding: "14px", background: "rgba(34,197,94,0.1)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.3)" }}>
                                <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 16 }}>✅ Bill Already Paid</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </div>
    );
}
