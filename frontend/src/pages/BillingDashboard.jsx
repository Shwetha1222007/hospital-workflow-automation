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
    red: "#ef4444",
    orange: "#f59e0b"
};

const badge = (color, txt) => (
    <span style={{
        background: `${color}15`, border: `1px solid ${color}40`,
        color, borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700,
    }}>{txt}</span>
);

export default function BillingDashboard({ onLogout }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");
    const [payMethod, setPayMethod] = useState({});

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

    const fetchInvoices = async () => {
        try {
            const res = await authAxios().get("/billing/");
            setInvoices(res.data);
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

<<<<<<< HEAD
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
=======
    useEffect(() => { fetchInvoices(); }, []);

    const processPayment = async (inv) => {
        const method = payMethod[inv.id] || "CASH";
        try {
            await authAxios().patch(`/billing/${inv.id}/pay`, { payment_method: method });
            showToast(`✅ Payment of $${inv.total_amount} recorded via ${method}`);
            fetchInvoices();
        } catch (err) {
            showToast("❌ " + (err?.response?.data?.detail || "Payment failed"));
        }
    };

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
                    <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#f59e0b,#ea580c)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0a0f1e", fontSize: 20 }}>$</div>
                    <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>MedFlow</div>
                        <div style={{ color: C.sub, fontSize: 11 }}>Billing & Payments</div>
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
                        <h1 style={{ color: "#fff", margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>Invoices</h1>
                        <div style={{ color: C.sub, fontSize: 14 }}>Manage patient billing and discharge</div>
                    </div>
                </div>

                {loading ? <div style={{ color: C.cyan, fontFamily: "monospace" }}>Loading invoices...</div> : invoices.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 80, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, color: C.sub }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>💳</div>
                        <h3 style={{ margin: 0, color: "#fff" }}>No Pending Invoices</h3>
                        <p style={{ marginTop: 8 }}>All patients are cleared for discharge.</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24 }}>
                        {invoices.map(inv => (
                            <div key={inv.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>INVOICE #{inv.id}</div>
                                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{inv.patient_code}</div>
                                        <div style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>{new Date(inv.created_at).toLocaleString()}</div>
                                    </div>
                                    {inv.status === "PENDING" ? badge(C.orange, "Payment Pending") : badge(C.green, "Paid & Discharged")}
                                </div>
                                <div style={{ padding: "24px", flex: 1 }}>
                                    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: C.sub }}>
                                            <span>Doctor Consultation</span>
                                            <span style={{ color: "#fff" }}>${(inv.consultation_fee || 50).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: C.sub }}>
                                            <span>Prescription Medicines</span>
                                            <span style={{ color: "#fff" }}>${(inv.medicine_fee || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: `1px solid ${C.border}`, marginBottom: 12, fontSize: 13, color: C.sub }}>
                                            <span>Lab Tests</span>
                                            <span style={{ color: "#fff" }}>${(inv.lab_fee || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ color: C.cyan, fontSize: 14, fontWeight: 700 }}>Total Due</span>
                                            <span style={{ color: "#fff", fontSize: 24, fontWeight: 800 }}>${inv.total_amount.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {inv.payment_status === "PENDING" ? (
                                        <>
                                            <div style={{ marginBottom: 16 }}>
                                                <label style={{ display: "block", color: C.sub, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>PAYMENT METHOD</label>
                                                <select
                                                    style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 8, color: "#fff", fontSize: 14 }}
                                                    value={payMethod[inv.id] || "CASH"}
                                                    onChange={e => setPayMethod(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                                >
                                                    <option value="CASH">💵 Cash</option>
                                                    <option value="CARD">💳 Credit/Debit Card</option>
                                                    <option value="INSURANCE">🏥 Insurance</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => processPayment(inv)}
                                                style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#f59e0b,#ea580c)", border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: "auto" }}
                                            >
                                                Record Payment →
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ padding: "16px", background: "rgba(34,197,94,0.1)", border: "1px dashed rgba(34,197,94,0.3)", borderRadius: 12, textAlign: "center" }}>
                                            <div style={{ color: C.green, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Paid via {inv.payment_method}</div>
                                            <div style={{ color: C.sub, fontSize: 12 }}>Patient has been discharged</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
>>>>>>> aecf9119b8ddc74c35cc7495da6266856b19c72f
        </div>
    );
}
