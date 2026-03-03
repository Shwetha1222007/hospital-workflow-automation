import React, { useState, useEffect } from "react";
import { authAxios } from "../context/AuthContext";
import Chatbot from "../components/Chatbot";
import { useTranslation } from "../hooks/useTranslation";

const C = {
  bg: "#0a0f1e", card: "rgba(255,255,255,0.04)", border: "rgba(0,212,255,0.12)",
  cyan: "#00d4ff", blue: "#0077ff", text: "#e8eaf0", sub: "rgba(255,255,255,0.45)",
};

const statusColor = {
  PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#22c55e",
  LAB_IN_PROGRESS: "#a855f7", LAB_COMPLETED: "#22c55e",
  OPEN: "#f59e0b", RESOLVED: "#22c55e",
};

// Backend color_code → hex
const LOG_COLORS = {
  RED: "#ef4444",
  GREEN: "#22c55e",
  YELLOW: "#f59e0b",
  BLUE: "#3b82f6",
};
const LOG_STATUS_LABELS = {
  RED: "Pending",
  GREEN: "Completed",
  YELLOW: "In Progress",
  BLUE: "Assigned",
};

const refTypeIcon = { PATIENT: "🏥", LAB: "🔬", TICKET: "📩" };
const deptIcon = {
  REGISTRATION: "🏥", CARDIOLOGIST: "❤️", ORTHOPEDIC: "🦴",
  NEUROLOGIST: "🧠", GENERAL: "👨‍⚕️", LAB: "🔬", BILLING: "💳",
  DOCTOR: "👨‍⚕️", TICKET: "📩", NURSE: "🩺", DEFAULT: "📍",
};

const ax = () => authAxios();

// ── Badge helper ─────────────────────────────────────────────────────────────
function Badge({ color, text }) {
  return (
    <span style={{
      background: `${color}20`, border: `1px solid ${color}50`,
      color, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700,
    }}>{text}</span>
  );
}

// ── Language Toggle ──────────────────────────────────────────────────────────
function LangToggle({ lang, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={lang === "en" ? "Switch to Tamil" : "Switch to English"}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 20,
        background: lang === "ta" ? "rgba(255,165,0,0.12)" : "rgba(0,212,255,0.10)",
        border: `1px solid ${lang === "ta" ? "rgba(255,165,0,0.35)" : "rgba(0,212,255,0.25)"}`,
        color: lang === "ta" ? "#ffa500" : C.cyan,
        fontSize: 13, fontWeight: 700, cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 16 }}>{lang === "en" ? "🇮🇳" : "🌐"}</span>
      {lang === "en" ? "தமிழ்" : "English"}
    </button>
  );
}

// ── Timeline Section ─────────────────────────────────────────────────────────
function TimelineTab({ patientId, t }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    ax().get(`/movement-logs/patient/${patientId}/summary`)
      .then(r => setSummary(r.data))
      .catch(() => setSummary({ steps: [], current_stage: "", stage_color: "YELLOW", time_in_stage_mins: 0 }))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div style={{ color: C.sub, marginTop: 40, textAlign: "center" }}>Loading…</div>;

  const steps = summary?.steps || [];
  const currentColor = { RED: "#ef4444", GREEN: "#22c55e", YELLOW: "#f59e0b", BLUE: "#3b82f6" }[summary?.stage_color] || "#f59e0b";

  return (
    <div>
      <h2 style={{ color: "#fff", marginBottom: 6 }}>🗺️ {t("timeline.title")}</h2>
      <div style={{ color: C.sub, fontSize: 13, marginBottom: 8 }}>{t("timeline.subtitle")}</div>

      {/* Current stage banner */}
      {summary?.current_stage && (
        <div style={{ background: `${currentColor}12`, border: `1px solid ${currentColor}40`, borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: currentColor, boxShadow: `0 0 8px ${currentColor}` }} />
          <div>
            <div style={{ color: currentColor, fontWeight: 700, fontSize: 13 }}>Current Stage</div>
            <div style={{ color: "#e2eaf5", fontWeight: 600, fontSize: 15 }}>{summary.current_stage}</div>
            <div style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>⏱ {summary.time_in_stage_mins} min{summary.time_in_stage_mins !== 1 ? "s" : ""} in this stage</div>
          </div>
        </div>
      )}

      {/* Color legend */}
      <div style={{ display: "flex", gap: 18, marginBottom: 24, flexWrap: "wrap" }}>
        {[["#22c55e", "Completed"], ["#ef4444", "Pending"], ["#f59e0b", "In Progress"], ["#3b82f6", "Assigned"]].map(([c, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            <span style={{ color: C.sub, fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>

      {steps.length === 0 && (
        <div style={{ color: C.sub, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
          {t("timeline.noLogs")}
        </div>
      )}

      {/* Step checklist */}
      <div style={{ position: "relative" }}>
        {steps.map((step, idx) => {
          const nodeColor = { RED: "#ef4444", GREEN: "#22c55e", YELLOW: "#f59e0b", BLUE: "#3b82f6" }[step.color_code] || "#f59e0b";
          const isLast = idx === steps.length - 1;
          const icon = step.color_code === "GREEN" ? "✅" : step.color_code === "RED" ? "🔴" : step.color_code === "BLUE" ? "🔵" : "🟡";
          return (
            <div key={idx} style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 32 }}>
                <div style={{ fontSize: 18, lineHeight: 1 }}>{icon}</div>
                {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: "linear-gradient(180deg,#1e2d4a,transparent)", marginTop: 4 }} />}
              </div>
              <div style={{
                flex: 1, background: C.card, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${nodeColor}`, borderRadius: 12, padding: "12px 16px",
                marginBottom: isLast ? 0 : 4,
              }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{step.action}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {step.actor_name && (
                    <span style={{ color: "#a3e635", fontSize: 11 }}>by {step.actor_name}</span>
                  )}
                  <span style={{ color: C.sub, fontSize: 11 }}>{new Date(step.timestamp).toLocaleString()}</span>
                  <span style={{ background: `${nodeColor}15`, border: `1px solid ${nodeColor}40`, color: nodeColor, borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                    {step.ref_type}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {steps.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <div style={{ width: 32, textAlign: "center" }}>⬜</div>
            <span style={{ color: C.sub, fontSize: 12 }}>Journey continues as treatment progresses…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Patient Dashboard ───────────────────────────────────────────────────
export default function PatientDashboard({ user, onLogout }) {
  const { t, lang, toggleLang } = useTranslation();

  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [labReports, setLabReports] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [newQuery, setNewQuery] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, l, tkt] = await Promise.all([
        ax().get("/patients/me/profile"),
        ax().get("/lab-reports/"),
        ax().get("/tickets/my"),
      ]);
      setProfile(p.data);
      setLabReports(l.data);
      setTickets(tkt.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const raiseTicket = async () => {
    if (!newQuery.trim()) return;
    try {
      await ax().post("/tickets/", { query_text: newQuery });
      showToast(`✅ Query submitted — auto-routed to department`);
      setNewQuery(""); fetchAll();
    } catch (e) {
      showToast("❌ " + (e?.response?.data?.detail || "Error"));
    }
  };

  const activeTickets = tickets.filter(t => t.status !== "RESOLVED");
  const resolvedTickets = tickets.filter(t => t.status === "RESOLVED");

  const TABS = [
    { id: "profile", label: `👤 ${t("nav.profile")}` },
    { id: "treatment", label: `💊 ${t("nav.treatment")}` },
    { id: "lab", label: `🔬 ${t("nav.lab")} (${labReports.length})` },
    { id: "tickets", label: `📩 ${t("nav.tickets")} (${activeTickets.length})` },
    { id: "timeline", label: `🗺️ ${t("nav.timeline")}` },
  ];

  const ticketColor = { OPEN: "#f59e0b", IN_PROGRESS: "#3b82f6", RESOLVED: "#22c55e" };

  const TicketCard = ({ tk }) => (
    <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${ticketColor[tk.status] || "#888"}18`, border: `2px solid ${ticketColor[tk.status] || "#888"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: ticketColor[tk.status] || "#888", flexShrink: 0 }}>
          {tk.status === "RESOLVED" ? "✓" : tk.status === "IN_PROGRESS" ? "⟳" : "!"}
        </div>
        <div style={{ flex: 1, width: 2, background: "rgba(255,255,255,0.07)", marginTop: 4 }} />
      </div>
      <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{tk.ticket_code}</div>
            <div style={{ color: C.cyan, fontSize: 11, fontWeight: 600 }}>→ {tk.department}</div>
          </div>
          <Badge color={ticketColor[tk.status] || "#888"} text={t(`status.${tk.status}`) || tk.status} />
        </div>
        <div style={{ color: C.sub, fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{tk.query_text}</div>
        {tk.assignee_name && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 6 }}>{t("tickets.assignedTo")}: {tk.assignee_name}</div>}
        <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{new Date(tk.created_at).toLocaleString()}</div>
        {tk.status === "RESOLVED" && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: 12 }}>
            ✅ {t("tickets.resolved")}: {tk.notes || t("tickets.issueAddressed")} · {tk.resolved_at ? new Date(tk.resolved_at).toLocaleString() : ""}
          </div>
        )}
      </div>
    </div>
  );

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
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#00d4ff,#0077ff)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0a0f1e", fontSize: 18 }}>+</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>MedFlow</div>
            <div style={{ color: C.sub, fontSize: 11 }}>{t("header.portal")}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LangToggle lang={lang} onToggle={toggleLang} />
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{profile?.name || user.name}</div>
            <div style={{ color: C.cyan, fontSize: 11 }}>🏥 {profile?.patient_code || "Patient"}</div>
          </div>
          <button onClick={onLogout} style={{ padding: "8px 16px", background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 9, color: "#ff6b6b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {t("header.signOut")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "18px 32px 0", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, borderRadius: "10px 10px 0 0", whiteSpace: "nowrap",
            background: tab === tb.id ? "rgba(0,212,255,0.12)" : "transparent",
            color: tab === tb.id ? C.cyan : C.sub,
            borderBottom: tab === tb.id ? `2px solid ${C.cyan}` : "2px solid transparent",
          }}>{tb.label}</button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
        {loading && <div style={{ color: C.sub, textAlign: "center", marginTop: 60 }}>Loading…</div>}

        {!loading && (
          <>
            {/* ── PROFILE ── */}
            {tab === "profile" && profile && (
              <div>
                <h2 style={{ color: "#fff", marginBottom: 20 }}>👤 {t("profile.title")}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    [t("profile.name"), profile.name],
                    [t("profile.patientId"), profile.patient_code],
                    [t("profile.age"), `${profile.age} ${t("profile.years")}`],
                    [t("profile.gender"), profile.gender],
                    [t("profile.phone"), profile.phone || "—"],
                    [t("profile.priority"), <Badge color={profile.priority === "EMERGENCY" ? "#ef4444" : "#22c55e"} text={t(`status.${profile.priority}`)} />],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
                      <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{val || "—"}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginTop: 16 }}>
                  <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{t("profile.complaint").toUpperCase()}</div>
                  <div style={{ color: "#fff" }}>{profile.complaint || "—"}</div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{t("profile.assignedDoctor").toUpperCase()}</div>
                    <div style={{ color: "#fff", fontWeight: 600 }}>{profile.doctor_name || "Not yet assigned"}</div>
                    <div style={{ color: C.sub, fontSize: 12 }}>{profile.specialization_required}</div>
                  </div>
                  <Badge color={statusColor[profile.status] || "#888"} text={t(`status.${profile.status}`) || profile.status} />
                </div>
              </div>
            )}

            {/* ── TREATMENT ── */}
            {tab === "treatment" && profile && (
              <div>
                <h2 style={{ color: "#fff", marginBottom: 20 }}>💊 {t("treatment.title")}</h2>
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t("treatment.currentStatus").toUpperCase()}</div>
                    <Badge color={statusColor[profile.status] || "#888"} text={t(`status.${profile.status}`) || profile.status} />
                  </div>
                  <div style={{ flex: 2, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                    <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{t("treatment.diagnosis").toUpperCase()}</div>
                    <div style={{ color: "#fff" }}>{profile.diagnosis || t("treatment.awaitingDiagnosis")}</div>
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
                  <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>{t("treatment.treatmentNotes").toUpperCase()}</div>
                  <div style={{ color: "#fff", lineHeight: 1.7 }}>{profile.treatment_notes || t("treatment.noNotes")}</div>
                </div>
                {/* Workflow progress */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>{t("treatment.workflowProgress").toUpperCase()}</div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {[
                      { key: "steps.registered", done: true },
                      { key: "steps.doctorReview", done: ["IN_PROGRESS", "COMPLETED", "LAB_IN_PROGRESS", "LAB_COMPLETED"].includes(profile.status) },
                      { key: "steps.labTests", done: ["LAB_IN_PROGRESS", "LAB_COMPLETED", "COMPLETED"].includes(profile.status) },
                      { key: "steps.completed", done: profile.status === "COMPLETED" },
                    ].map((step, i, arr) => (
                      <React.Fragment key={step.key}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: step.done ? "linear-gradient(135deg,#00d4ff,#0077ff)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: step.done ? "#0a0f1e" : C.sub, fontWeight: 700, fontSize: 12, border: step.done ? "none" : `1px solid ${C.border}` }}>
                            {step.done ? "✓" : i + 1}
                          </div>
                          <div style={{ color: step.done ? "#fff" : C.sub, fontSize: 11, fontWeight: step.done ? 600 : 400, textAlign: "center" }}>
                            {t(`treatment.${step.key}`)}
                          </div>
                        </div>
                        {i < arr.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: step.done ? "linear-gradient(90deg,#00d4ff,#0077ff)" : "rgba(255,255,255,0.08)", marginBottom: 20 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── LAB ── */}
            {tab === "lab" && (
              <div>
                <h2 style={{ color: "#fff", marginBottom: 20 }}>🔬 {t("lab.title")} ({labReports.length})</h2>
                {labReports.length === 0 && <div style={{ color: C.sub }}>{t("lab.noTests")}</div>}
                {labReports.map(l => (
                  <div key={l.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{l.report_code} — {l.test_type}</div>
                        <div style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>{t("lab.prescribed")}: {new Date(l.created_at).toLocaleDateString()}</div>
                      </div>
                      <Badge color={{ PENDING: "#f59e0b", IN_PROGRESS: "#3b82f6", COMPLETED: "#22c55e" }[l.status] || "#888"} text={t(`status.${l.status}`) || l.status} />
                    </div>
                    {l.notes && <div style={{ color: "#a3e635", fontSize: 13 }}>📋 {l.notes}</div>}

                    {l.status === "COMPLETED" && l.file_path ? (
                      <a href={`http://localhost:8000/uploads/${l.file_path.split("/").pop()}`} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 14px", background: "rgba(0,212,255,0.1)", border: `1px solid ${C.border}`, borderRadius: 9, color: C.cyan, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                        📄 {t("lab.downloadReport")}
                      </a>
                    ) : l.status !== "PENDING" ? (
                      <div style={{ color: C.sub, fontSize: 12, marginTop: 10 }}>⏳ {t("lab.reportPending")}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* ── TICKETS ── */}
            {tab === "tickets" && (
              <div>
                <h2 style={{ color: "#fff", marginBottom: 20 }}>📩 {t("tickets.title")}</h2>

                {/* New query form */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
                  <div style={{ color: "#fff", fontWeight: 600, marginBottom: 10 }}>{t("tickets.newQuery")}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, color: "#fff", fontSize: 13 }}
                      placeholder={t("tickets.placeholder")}
                      value={newQuery}
                      onChange={e => setNewQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && raiseTicket()}
                    />
                    <button onClick={raiseTicket} style={{ padding: "10px 20px", background: "linear-gradient(135deg,#00d4ff,#0077ff)", border: "none", borderRadius: 10, color: "#0a0f1e", fontWeight: 700, cursor: "pointer" }}>
                      {t("tickets.submit")}
                    </button>
                  </div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 8 }}>
                    💡 Your query will be automatically assigned to the correct department (Doctor, Nurse, Lab, Pharmacy, Billing, or Admin)
                  </div>
                </div>

                {/* Active tickets */}
                {activeTickets.length === 0 && resolvedTickets.length === 0 && (
                  <div style={{ color: C.sub }}>{t("tickets.noTickets")}</div>
                )}

                {activeTickets.length > 0 && (
                  <>
                    <div style={{ color: C.sub, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                      Active ({activeTickets.length})
                    </div>
                    {activeTickets.map(tk => <TicketCard key={tk.id} tk={tk} />)}
                  </>
                )}

                {/* Resolved tickets */}
                {resolvedTickets.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, opacity: 0.7 }}>
                      ✅ Resolved History ({resolvedTickets.length})
                    </div>
                    <div style={{ opacity: 0.65 }}>
                      {resolvedTickets.map(tk => <TicketCard key={tk.id} tk={tk} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TIMELINE ── */}
            {tab === "timeline" && (
              <TimelineTab patientId={profile?.id} t={t} />
            )}
          </>
        )}
      </div>

      {/* Floating Chatbot */}
      <Chatbot lang={lang} t={t} />
    </div>
  );
}
