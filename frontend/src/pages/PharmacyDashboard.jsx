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
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

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
        </div>
    );
}
