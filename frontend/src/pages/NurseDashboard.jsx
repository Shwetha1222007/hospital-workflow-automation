import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const PRIORITY_COLOR = { NORMAL: "#22c55e", EMERGENCY: "#ef4444" };

function StatusBadge({ status }) {
    const cfg = {
        PENDING: ["#64748b", "rgba(100,116,139,0.12)", "Pending"],
        IN_PROGRESS: ["#f59e0b", "rgba(245,158,11,0.12)", "In Progress"],
        COMPLETED: ["#22c55e", "rgba(34,197,94,0.12)", "Completed"],
    }[status] || ["#64748b", "rgba(100,116,139,0.12)", status];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg[0], background: cfg[1], border: `1px solid ${cfg[0]}33`, fontFamily: "monospace" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg[0] }} /> {cfg[2]}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const p = priority?.toUpperCase() || "NORMAL";
    const color = PRIORITY_COLOR[p] || "#22c55e";
    return (
        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, color, background: `${color}15`, border: `1px solid ${color}33`, fontFamily: "monospace" }}>
            {p === "EMERGENCY" ? "🚨 " : ""} {p}
        </span>
    );
}

export default function NurseDashboard({ user, onLogout }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const token = localStorage.getItem("token");

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API}/patients/`, { headers: { Authorization: `Bearer ${token}` } });
            setPatients(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const updateStatus = async (pcode, newStatus) => {
        try {
            await axios.patch(`${API}/patients/${pcode}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
        } catch (err) { alert("Status update failed"); }
    };

    const filtered = patients.filter(p => filterStatus === "ALL" || p.status === filterStatus);

    const s = {
        wrap: { minHeight: "100vh", background: "#060b14", color: "#e2eaf5", fontFamily: "'DM Sans', sans-serif" },
        container: { maxWidth: 1200, margin: "0 auto", padding: 40 },
        card: { background: "#0d1526", border: "1px solid #1e2d4a", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" },
        patCard: { background: "#060b14", border: "1px solid #1e2d4a", borderRadius: 12, padding: 20, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center" },
    };

    return (
        <div style={s.wrap}>
            <Navbar user={{ full_name: user.name, role: user.role }} onLogout={onLogout} />

            <div style={s.container}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                    <div>
                        <div style={{ fontSize: 12, color: "#00d4ff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Nurse Dashboard</div>
                        <h1 style={{ margin: 0, fontSize: 28 }}>Patients Care Portal</h1>
                        <div style={{ color: "#5a7aa0", fontSize: 14, marginTop: 4 }}>Managing patients under {(patients[0]?.doctor_name) || "Assigned Doctor"}</div>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(st => (
                            <button key={st} onClick={() => setFilterStatus(st)} style={{ padding: "8px 16px", borderRadius: 10, background: filterStatus === st ? "#00d4ff15" : "#0d1526", border: `1px solid ${filterStatus === st ? "#00d4ff44" : "#1e2d4a"}`, color: filterStatus === st ? "#00d4ff" : "#5a7aa0", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <div style={{ color: "#00d4ff", fontFamily: "monospace" }}>Establishing secure link...</div> : (
                    <div>
                        {filtered.length === 0 ? (
                            <div style={{ ...s.card, textAlign: "center", padding: 60, color: "#5a7aa0" }}>
                                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                                <div>No patients found with status {filterStatus}</div>
                            </div>
                        ) : (
                            <div>
                                {filtered.map(p => (
                                    <div key={p.id} style={s.patCard}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                                <span style={{ fontFamily: "monospace", color: "#00d4ff", fontWeight: 700, fontSize: 13 }}>{p.patient_code}</span>
                                                <PriorityBadge priority={p.priority} />
                                            </div>
                                            <div style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</div>
                                            <div style={{ fontSize: 12, color: "#4a6a8a", marginTop: 2 }}>{p.age}y · {p.gender}</div>
                                        </div>

                                        <div style={{ padding: "0 20px" }}>
                                            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#4a6a8a", marginBottom: 4 }}>Chief Complaint</div>
                                            <div style={{ fontSize: 13, color: "#e2eaf5", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"{p.complaint}"</div>
                                            <div style={{ marginTop: 8 }}><StatusBadge status={p.status} /></div>
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                            {p.status === "PENDING" && (
                                                <button onClick={() => updateStatus(p.patient_code, "IN_PROGRESS")} style={{ padding: "10px 18px", borderRadius: 8, background: "#f59e0b11", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Start Care</button>
                                            )}
                                            {p.status === "IN_PROGRESS" && (
                                                <button onClick={() => updateStatus(p.patient_code, "COMPLETED")} style={{ padding: "10px 18px", borderRadius: 8, background: "#22c55e11", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark Completed</button>
                                            )}
                                            {p.status === "COMPLETED" && (
                                                <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>✔ Consultation Finished</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
