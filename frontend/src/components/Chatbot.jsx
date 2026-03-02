import React, { useState, useRef, useEffect } from "react";
import { authAxios } from "../context/AuthContext";

const S = {
    // Floating bubble trigger
    bubble: {
        position: "fixed", bottom: 28, right: 28, zIndex: 1000,
        width: 60, height: 60, borderRadius: "50%",
        background: "linear-gradient(135deg,#00d4ff,#0077ff)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,212,255,0.45)",
        border: "none", transition: "transform 0.2s",
    },
    // Chat window
    window: {
        position: "fixed", bottom: 100, right: 28, zIndex: 1000,
        width: 360, height: 480, borderRadius: 20,
        background: "rgba(10,15,30,0.97)",
        border: "1px solid rgba(0,212,255,0.2)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
    },
    header: {
        padding: "14px 18px",
        background: "linear-gradient(135deg,rgba(0,212,255,0.12),rgba(0,119,255,0.08))",
        borderBottom: "1px solid rgba(0,212,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { color: "#fff", fontWeight: 700, fontSize: 15 },
    headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
    messages: { flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 },
    msgUser: {
        alignSelf: "flex-end", background: "linear-gradient(135deg,#0077ff,#00d4ff)",
        color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "9px 14px",
        maxWidth: "80%", fontSize: 13, lineHeight: 1.5,
    },
    msgBot: {
        alignSelf: "flex-start", background: "rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.88)", borderRadius: "16px 16px 16px 4px",
        padding: "9px 14px", maxWidth: "82%", fontSize: 13, lineHeight: 1.5,
        border: "1px solid rgba(255,255,255,0.06)",
    },
    ticketBtn: {
        marginTop: 8, padding: "8px 14px",
        background: "linear-gradient(135deg,#ff6b35,#ff4444)",
        border: "none", borderRadius: 10, color: "#fff",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        boxShadow: "0 4px 16px rgba(255,107,53,0.35)",
    },
    inputRow: {
        padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", gap: 8,
    },
    input: {
        flex: 1, padding: "9px 14px", borderRadius: 12,
        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(0,212,255,0.12)",
        color: "#fff", fontSize: 13, outline: "none",
    },
    sendBtn: {
        padding: "9px 16px", borderRadius: 12,
        background: "linear-gradient(135deg,#00d4ff,#0077ff)",
        border: "none", color: "#0a0f1e", fontWeight: 700, fontSize: 13, cursor: "pointer",
    },
};

export default function Chatbot({ t: tProp }) {
    // Use passed t() or fall back to identity fn (for pages without i18n)
    const t = tProp || ((key) => key.split(".").pop());

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "bot", text: t("chatbot.greeting") },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState("");
    const bottomRef = useRef(null);

    // Reset greeting when language changes
    useEffect(() => {
        setMessages([{ role: "bot", text: t("chatbot.greeting") }]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tProp]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput("");
        const history = messages.filter(m => m.role !== "bot-ticket").map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
        }));
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setLoading(true);
        try {
            const ax = authAxios();
            const res = await ax.post("/chatbot/chat", { message: userMsg, history });
            const { reply, unresolved, suggested_dept } = res.data;
            setMessages(prev => [
                ...prev,
                { role: "bot", text: reply, unresolved, suggested_dept, originalMsg: userMsg },
            ]);
        } catch {
            setMessages(prev => [...prev, { role: "bot", text: t("chatbot.error") }]);
        } finally {
            setLoading(false);
        }
    };

    const createTicket = async (msg) => {
        try {
            const ax = authAxios();
            const res = await ax.post("/chatbot/create-ticket", { query_text: msg });
            const { ticket_code, department } = res.data;
            showToast(`✅ ${t("chatbot.ticketCreated")} ${ticket_code} → ${department} ${t("chatbot.dept")}`);
            setMessages(prev => [...prev, { role: "bot", text: `✅ ${t("chatbot.ticketCreated")}: ${ticket_code} → ${department}` }]);
        } catch (e) {
            showToast("❌ Could not create ticket. Please try again.");
        }
    };

    return (
        <>
            {toast && (
                <div style={{
                    position: "fixed", top: 20, right: 20, zIndex: 2000,
                    background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)",
                    borderRadius: 12, padding: "12px 18px", color: "#00d4ff",
                    fontSize: 13, fontWeight: 600, backdropFilter: "blur(10px)",
                }}>
                    {toast}
                </div>
            )}

            {open && (
                <div style={S.window}>
                    <div style={S.header}>
                        <div>
                            <div style={S.headerTitle}>🤖 {t("chatbot.title")}</div>
                            <div style={S.headerSub}>{t("chatbot.subtitle")}</div>
                        </div>
                        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}>✕</button>
                    </div>

                    <div style={S.messages}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                                <div style={m.role === "user" ? S.msgUser : S.msgBot}>{m.text}</div>
                                {m.unresolved && (
                                    <button style={S.ticketBtn} onClick={() => createTicket(m.originalMsg)}>
                                        📩 {t("chatbot.raiseTicket")} → {m.suggested_dept}
                                    </button>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ ...S.msgBot, color: "rgba(255,255,255,0.4)" }}>
                                <span>{t("chatbot.thinking")}</span>
                                <span>...</span>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    <div style={S.inputRow}>
                        <input
                            style={S.input}
                            placeholder={t("chatbot.placeholder")}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                        />
                        <button style={S.sendBtn} onClick={sendMessage} disabled={loading}>
                            {loading ? "..." : t("chatbot.send")}
                        </button>
                    </div>
                </div>
            )}

            <button style={S.bubble} onClick={() => setOpen(o => !o)} title="Chat with MedBot">
                {open ? "✕" : "💬"}
            </button>
        </>
    );
}
