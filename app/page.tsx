"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  Building2,
  User,
  FileText,
  MessageSquare,
  Trash2,
  RefreshCw,
  PlusCircle,
  ChevronRight,
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  Save,
} from "lucide-react";
import { DEMO_ACCOUNTS } from "@/lib/xtrace";

type Account = (typeof DEMO_ACCOUNTS)[0];
type Memory = { id: string; text: string; created_at?: string };
type Toast = { message: string; type: "success" | "error" } | null;

const SUGGESTED = [
  "Who is our champion and what do they care about?",
  "What are the current blockers to closing?",
  "What competitive intel do we have?",
  "What commitments have we made to them?",
  "What's the budget and approval situation?",
];

function getStageClass(stage: string) {
  if (stage === "Negotiation") return "stage-negotiation";
  if (stage === "Legal Review") return "stage-legal";
  return "stage-evaluation";
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function HomePage() {
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const activeAccountRef = useRef<Account | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "ingest">("chat");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Keep ref in sync so transport closures can read current value
  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs }) => ({
        body: {
          messages: msgs,
          accountId: activeAccountRef.current?.id ?? "",
          accountName: activeAccountRef.current?.name ?? "",
          repId: "rep_kritansh",
        },
      }),
    }),
    onError: () => showToast("Chat error. Check your API keys and try again.", "error"),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const loadMemories = useCallback(async (accountId: string) => {
    setMemoriesLoading(true);
    setMemories([]);
    try {
      const res = await fetch(`/api/memories?accountId=${accountId}`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch {
      showToast("Failed to load memories", "error");
    } finally {
      setMemoriesLoading(false);
    }
  }, []);

  const selectAccount = (account: Account) => {
    setActiveAccount(account);
    setMessages([]);
    setNoteText("");
    setIngestResult(null);
    setInputValue("");
    setActiveTab("chat");
    loadMemories(account.id);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading || !activeAccount) return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
  };

  const handleSeedData = async () => {
    if (!activeAccount) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/memories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: activeAccount.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ Seeded ${data.totalCreated} memories for ${activeAccount.name}`);
        await loadMemories(activeAccount.id);
      } else {
        showToast(data.error || "Seeding failed", "error");
      }
    } catch {
      showToast("Seeding failed", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleIngest = async () => {
    if (!activeAccount || !noteText.trim()) return;
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: activeAccount.id, note: noteText.trim(), repId: "rep_kritansh" }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestResult({ type: "success", msg: `✓ ${data.memoriesCreated} fact${data.memoriesCreated !== 1 ? "s" : ""} extracted and saved` });
        setNoteText("");
        await loadMemories(activeAccount.id);
        // Auto-dismiss success message after 4s
        setTimeout(() => setIngestResult(null), 4000);
      } else {
        setIngestResult({ type: "error", msg: data.error || "Ingest failed" });
      }
    } catch {
      setIngestResult({ type: "error", msg: "Network error" });
    } finally {
      setIngesting(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    try {
      await fetch("/api/memories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId }),
      });
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newH = Math.max(44, Math.min(el.scrollHeight, 120));
    el.style.height = newH + "px";
    // switch line-height so text wraps naturally when multi-line
    el.style.lineHeight = newH > 44 ? "1.5" : "44px";
    el.style.padding = newH > 44 ? "10px 14px" : "0 14px";
  }, [inputValue]);

  const hasMessages = messages.length > 0;

  return (
    <div className="app-shell">
      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Brand block — replaces the removed topbar */}
          <div className="sidebar-brand">
            <div className="topbar-logo"><Brain size={18} /></div>
            <div>
              <div className="topbar-title">SalesMemory</div>
              <div className="topbar-sub">B2B Account Intelligence Agent</div>
            </div>
          </div>

          <div className="sidebar-header">
            <div className="sidebar-title">Accounts</div>
          </div>

          <div className="account-list">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.id}
                className={`account-card ${activeAccount?.id === account.id ? "active" : ""}`}
                onClick={() => selectAccount(account)}
                id={`account-${account.id.replace("grp_", "")}`}
              >
                <div className="account-card-header">
                  <div className="account-avatar" style={{ background: account.color }}>
                    {getInitials(account.name)}
                  </div>
                  <div>
                    <div className="account-name">{account.name}</div>
                    <div className="account-industry">{account.industry}</div>
                  </div>
                </div>
                <div className="account-meta">
                  <span className="account-value">{account.value}</span>
                  <span className={`stage-badge ${getStageClass(account.stage)}`}>{account.stage}</span>
                </div>
                <div className="health-bar">
                  <div className="health-bar-track">
                    <div className="health-bar-fill" style={{ width: `${account.health}%`, background: account.color }} />
                  </div>
                  <div className="health-label">
                    <span>Deal health</span>
                    <span>{account.health}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Panel */}
        <main className="center-panel">
          {!activeAccount ? (
            <div className="no-account">
              <div className="no-account-icon"><Building2 size={30} /></div>
              <h2>Select an Account</h2>
              <p>Choose an account from the sidebar to start querying its AI-powered memory and deal intelligence.</p>
            </div>
          ) : (
            <>
              <div className="account-header">
                <div className="account-header-left">
                  <div className="account-header-avatar" style={{ background: activeAccount.color }}>
                    {getInitials(activeAccount.name)}
                  </div>
                  <div>
                    <div className="account-header-name">{activeAccount.name}</div>
                    <div className="account-header-meta">
                      Champion: <strong>{activeAccount.champion}</strong> · {activeAccount.stage} · {activeAccount.value}
                    </div>
                  </div>
                </div>
                <div className="account-header-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => loadMemories(activeAccount.id)}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </div>

              <div className="tabs">
                <button className={`tab-btn ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")} id="tab-chat">
                  <MessageSquare size={14} /> Ask the Brain
                </button>
                <button className={`tab-btn ${activeTab === "ingest" ? "active" : ""}`} onClick={() => setActiveTab("ingest")} id="tab-ingest">
                  <PlusCircle size={14} /> Add Notes
                </button>
              </div>

              <div className="tab-content">
                {activeTab === "chat" ? (
                  <>
                    <div className="chat-messages">
                      {!hasMessages ? (
                        <div className="empty-chat">
                          <div className="empty-chat-icon"><Sparkles size={26} /></div>
                          <h3>Ask anything about {activeAccount.name}</h3>
                          <p>The AI searches through accumulated call notes, stakeholder info, and deal history to answer your questions.</p>
                          <div className="suggested-questions">
                            {SUGGESTED.map((q) => (
                              <button key={q} className="suggested-q" onClick={() => setInputValue(q)}>
                                {q}
                              </button>
                            ))}
                          </div>
                          {memories.length === 0 && (
                            <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--amber-light)", border: "1px solid #fcd34d", borderRadius: "var(--radius-md)", maxWidth: 360 }}>
                              <p style={{ fontSize: 12, color: "var(--amber)", margin: 0 }}>
                                ⚠️ No memories yet. Go to <strong>Add Notes</strong> → <strong>Load Demo Data</strong> first to seed account context.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className={`message-row ${msg.role}`}>
                            <div className={`message-avatar ${msg.role === "assistant" ? "ai" : "user"}`}>
                              {msg.role === "assistant" ? <Brain size={14} /> : <User size={14} />}
                            </div>
                            <div className={`message-bubble ${msg.role === "assistant" ? "ai" : "user"}`}>
                              {msg.parts.map((part, i) => {
                                if (part.type === "text") {
                                  return part.text ? (
                                    <div key={i} dangerouslySetInnerHTML={{ __html: formatMessage(part.text) }} />
                                  ) : null;
                                }
                                return null;
                              })}
                              {msg.role === "assistant" && msg.parts.every(p => p.type !== "text" || !p.text) && isLoading && (
                                <div className="tool-call-indicator">
                                  <Loader2 size={11} style={{ animation: "spin 0.7s linear infinite" }} />
                                  Searching memory &amp; generating…
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                      <div className="chat-input-row">
                        <textarea
                          ref={textareaRef}
                          className="chat-textarea"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={`Ask about ${activeAccount.name}… (Enter to send)`}
                          rows={1}
                          id="chat-input"
                          disabled={isLoading}
                        />
                        <button
                          className="btn btn-primary btn-icon"
                          onClick={handleSendMessage}
                          disabled={isLoading || !inputValue.trim()}
                          id="chat-send"
                        >
                          {isLoading
                            ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />
                            : <Send size={16} />
                          }
                        </button>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                        <Zap size={11} color="var(--accent)" />
                        XTrace memory + Groq llama-3.3-70b · {memories.length} memories indexed
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="ingest-panel">
                    <div className="ingest-card">
                      <h3>Add Account Note</h3>
                      <p>Paste call summaries, email threads, meeting notes, or any account intel. XTrace automatically extracts and structures the key facts.</p>
                      <label className="form-label" htmlFor="note-textarea">Note / Summary</label>
                      <textarea
                        id="note-textarea"
                        className="form-textarea"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder={`Example: Call with ${activeAccount.champion} on June 10. They confirmed the budget is now approved and legal review is complete. Main remaining concern is integration timeline with their existing AWS stack...`}
                      />
                      <div className="form-actions">
                        <button className="btn btn-primary" onClick={handleIngest} disabled={ingesting || !noteText.trim()} id="ingest-btn">
                          {ingesting
                            ? <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> Extracting…</>
                            : <><FileText size={14} /> Extract & Save</>
                          }
                        </button>
                        {noteText && (
                          <button className="btn btn-ghost" onClick={() => { setNoteText(""); setIngestResult(null); }}>
                            <X size={14} /> Clear
                          </button>
                        )}
                        <span className="char-count">{noteText.length} chars</span>
                      </div>
                      {ingestResult && (
                        <div className={`ingest-result ${ingestResult.type}`}>
                          {ingestResult.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                          {ingestResult.msg}
                        </div>
                      )}
                    </div>

                    <div className="seed-section">
                      <h4>🚀 Quick Start: Load Demo Data</h4>
                      <p>Seed pre-written realistic account notes for <strong>{activeAccount.name}</strong> to see memory extraction in action immediately.</p>
                      <button className="btn btn-primary" onClick={handleSeedData} disabled={seeding} id="seed-btn">
                        {seeding
                          ? <><Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} /> Seeding…</>
                          : <><Sparkles size={14} /> Load Demo Data</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right Panel — Live Memories */}
        <aside className="right-panel">
          <div className="right-panel-header">
            <div className="right-panel-title">
              <Brain size={15} color="var(--accent)" />
              Account Memory
              {memories.length > 0 && <span className="memory-count">{memories.length}</span>}
            </div>
            {activeAccount && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => loadMemories(activeAccount.id)} title="Refresh">
                <RefreshCw size={13} />
              </button>
            )}
          </div>

          {!activeAccount ? (
            <div className="memories-empty">
              <Brain size={28} />
              <p>Select an account to view its extracted memory facts.</p>
            </div>
          ) : memoriesLoading ? (
            <div className="memories-loading">
              <div className="spinner" />
              Loading memories…
            </div>
          ) : memories.length === 0 ? (
            <div className="memories-empty">
              <Brain size={28} />
              <p>No memories yet. Add notes or load demo data to see AI-extracted facts here.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setActiveTab("ingest")}>
                <ChevronRight size={13} /> Add Notes
              </button>
            </div>
          ) : (
            <div className="memories-list">
              {memories.map((m) => (
                <div key={m.id} className="memory-item">
                  <div className="memory-text">{m.text}</div>
                  {m.created_at
                    ? <div className="memory-date">{formatDate(m.created_at)}</div>
                    : <div className="memory-date">Recently added</div>
                  }
                  <button className="memory-delete" onClick={() => handleDeleteMemory(m.id)} title="Delete">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast">
          {toast.type === "success" ? <CheckCircle2 size={15} color="#86efac" /> : <AlertCircle size={15} color="#fca5a5" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function formatMessage(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code style='background:var(--bg);padding:1px 4px;border-radius:3px;font-size:0.9em'>$1</code>")
    .replace(/^- (.*?)$/gm, "<li>$1</li>")
    .replace(/^• (.*?)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^(?!<[hup]|<br)(.*[^\s].*)$/gm, (m) => `<p>${m}</p>`)
    .replace(/<p><\/p>/g, "")
    .replace(/<p>(<ul>)/g, "$1")
    .replace(/(<\/ul>)<\/p>/g, "$1");
}
