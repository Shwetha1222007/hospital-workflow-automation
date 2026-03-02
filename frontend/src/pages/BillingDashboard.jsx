import React, { useState, useEffect } from "react";
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
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

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
        </div>
    );
}
