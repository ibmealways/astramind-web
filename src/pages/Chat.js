import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/chat.css";
import { persistContentLabExperiment } from "../services/contentLabExperimentService.js";

import { useOSMode } from "../context/ModeContext.js";
import { APP_MODES } from "../config/modeConfig.js";
import { loadCreatorMemory } from "../core/memory/creatorMemory.js";

import {
  buildAdaptiveSystemPrompt,
  logAdaptiveEvent,
} from "../core/adaptive/adaptiveEngine.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const authenticatedHeaders = (extra={}) => ({...extra,Authorization:`Bearer ${localStorage.getItem("astramind_token")||""}`});

const HANDOFF_KEY = "astramind_handoff";
const CHAT_STORE_KEY = "astramind_saved_chats";
const ACTIVE_CHAT_KEY = "astramind_active_chat_id";
const MEMORY_USER_KEY = "astramind_memory_user_id";

const DEFAULT_MESSAGE = {
  role: "assistant",
  content: "🤖 AstraMind Chat online. What are we building today?",
  meta: { source: "SYSTEM" },
};

const WORKSPACE_MAP = {
  book: {
    label: "Book Writer",
    path: "/content/book",
    description: "This request is best continued in the Book Writer workspace.",
  },
  content: {
    label: "Creator Studio",
    path: "/content",
    description:
      "This request is best continued in Creator Studio.",
  },
  experiment: {
    label: "Content Lab",
    path: "/content-lab",
    description: "Continue this governed product experiment in Content Lab.",
  },
  research: {
    label: "Research Workspace",
    path: "/research",
    description: "This request is best continued in the Research Workspace.",
  },
  finance: {
    label: "Finance OS",
    path: "/finance",
    description: "This request is best continued in the Finance OS workspace.",
  },
};

function createNewChat() {
  const now = new Date().toISOString();

  return {
    id: `chat_${Date.now()}`,
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [DEFAULT_MESSAGE],
  };
}

function loadSavedChats() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORE_KEY)) || [];
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveChats(chats) {
  localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(chats));
}

function getMemoryUserId() {
  const existing = localStorage.getItem(MEMORY_USER_KEY);
  if (existing) return existing;
  const id = globalThis.crypto?.randomUUID?.() || `anonymous_${Date.now()}`;
  localStorage.setItem(MEMORY_USER_KEY, id);
  return id;
}

function makeChatTitle(text = "") {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return "New Chat";
  return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function normalizeAssistantReply(data) {
  if (typeof data === "string") return data;

  const reply = (
    data?.reply ||
    data?.script ||
    data?.content ||
    data?.analysis ||
    data?.result ||
    data?.message
  );
  if (reply) return reply;
  if (data?.suggestedNextStep?.path) {
    return data.suggestedNextStep.reason || "Your request is ready to continue in the suggested AstraMind workspace.";
  }
  return "AstraMind completed the request but did not receive displayable output. Check Mission Control for execution details.";
}

function compactHistoryForApi(history = []) {
  return history
    .filter((message) => ["user", "assistant", "system"].includes(message?.role))
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").replace(/\s+/g, " ").trim().slice(0, 6000),
    }))
    .filter(({ content }) => content);
}

function normalizeWorkspaceLabel(label, fallback = "Workspace") {
  return String(label || fallback).replace(/^open\s+/i, "").trim() || fallback;
}

function resolveWorkspaceFromRoute(data) {
  const route = String(data?.route || "").toLowerCase();
  const path = String(data?.suggestedNextStep?.path || "").toLowerCase();

  if (route.includes("book") || path.includes("/content/book")) {
    return WORKSPACE_MAP.book;
  }

  if (route.includes("content lab") || path.includes("/content-lab")) {
    return WORKSPACE_MAP.experiment;
  }

  if (
    route.includes("content") ||
    route.includes("creator") ||
    path.includes("/content")
  ) {
    return WORKSPACE_MAP.content;
  }

  if (route.includes("research") || path.includes("/research")) {
    return WORKSPACE_MAP.research;
  }

  if (route.includes("finance") || path.includes("/finance")) {
    return WORKSPACE_MAP.finance;
  }

  return null;
}

function buildHandoffPayload({ userPrompt, assistantReply, data, workspace }) {
  return {
    from: "chat",
    prompt: userPrompt,
    reply: assistantReply,
    route: data?.route || workspace?.label || "content_creation",
    path: workspace?.path || "/content",
    outputMode: data?.outputMode || "AUTO",
    agent: data?.agent || null,
    financeMode:
      data?.financeMode || data?.suggestedNextStep?.targetSection || null,
    targetSection:
      data?.suggestedNextStep?.targetSection || data?.financeMode || null,
    research: data?.research || null,
    citations: data?.citations || [],
    artifact: data?.artifact || null,
    contentLabExperiment: data?.contentLabExperiment || null,
    createdAt: new Date().toISOString(),
  };
}

function shouldAutoPromptWorkspace(workspace) {
  if (!workspace?.path || workspace.path === "/chat") return false;

  const existing = localStorage.getItem(HANDOFF_KEY);
  if (!existing) return true;

  try {
    const parsed = JSON.parse(existing);
    const createdAt = parsed?.createdAt
      ? new Date(parsed.createdAt).getTime()
      : 0;

    return Date.now() - createdAt > 30000;
  } catch {
    return true;
  }
}

function sourceLabel(message) {
  if (message.role === "user") return "You";
  if (message.meta?.source === "SYSTEM") return "System";
  if (message.meta?.source === "ERROR") return "Error";
  return message.meta?.source || "AstraMind";
}

export default function Chat() {
  const navigate = useNavigate();
  const { setMode } = useOSMode();
  const creator = useMemo(() => loadCreatorMemory?.() || null, []);
  const memoryUserId = useMemo(
    () => creator?.userId || creator?.id || getMemoryUserId(),
    [creator]
  );
  const listRef = useRef(null);

  const [status, setStatus] = useState("CONNECTED");
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [stickToBottom, setStickToBottom] = useState(true);
  const [selectedOutputMode, setSelectedOutputMode] = useState("AUTO");
  const [notice, setNotice] = useState("");
  const [missionHistory, setMissionHistory] = useState([]);
  const [missionHistoryLoading, setMissionHistoryLoading] = useState(false);
  const [memoryManagerOpen, setMemoryManagerOpen] = useState(false);
  const [memories, setMemories] = useState([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryRetentionDays, setMemoryRetentionDays] = useState(90);

  const [chats, setChats] = useState(() => {
    const saved = loadSavedChats();

    if (saved.length > 0) return saved;

    const firstChat = createNewChat();
    saveChats([firstChat]);
    localStorage.setItem(ACTIVE_CHAT_KEY, firstChat.id);
    return [firstChat];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    const savedActive = localStorage.getItem(ACTIVE_CHAT_KEY);
    const savedChats = loadSavedChats();

    if (savedActive && savedChats.some((chat) => chat.id === savedActive)) {
      return savedActive;
    }

    return savedChats[0]?.id || null;
  });

  const activeChat = useMemo(() => {
    return chats.find((chat) => chat.id === activeChatId) || chats[0] || null;
  }, [chats, activeChatId]);

  const messages = useMemo(
    () => activeChat?.messages || [DEFAULT_MESSAGE],
    [activeChat]
  );

  const refreshMissionHistory = useCallback(async () => {
    setMissionHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/missions?limit=6`,{headers:authenticatedHeaders()});
      if (!response.ok) return;
      const data = await response.json();
      setMissionHistory(Array.isArray(data?.missions) ? data.missions : []);
    } catch {
      // Chat remains usable when mission history is temporarily unavailable.
    } finally {
      setMissionHistoryLoading(false);
    }
  }, []);

  const refreshMemories = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/memory?limit=30`, {
        headers: authenticatedHeaders({ "x-memory-user-id": memoryUserId }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setMemories(Array.isArray(data?.memories) ? data.memories : []);
      setMemoryRetentionDays(data?.retentionDays || 90);
    } finally {
      setMemoryLoading(false);
    }
  }, [memoryUserId]);

  const deleteMemory = async (memoryId) => {
    await fetch(`${API_URL}/api/chat/memory/${memoryId}`, {
      method: "DELETE",
      headers: authenticatedHeaders({ "x-memory-user-id": memoryUserId }),
    });
    await refreshMemories();
  };

  const clearMemories = async () => {
    if (!window.confirm("Delete all persistent conversation memories?")) return;
    await fetch(`${API_URL}/api/chat/memory`, {
      method: "DELETE",
      headers: authenticatedHeaders({ "x-memory-user-id": memoryUserId }),
    });
    await refreshMemories();
  };

  const decideMission = async (approvalId, decision) => {
    setThinking(true);
    setStatus(decision === "approve" ? "EXECUTING" : "CONNECTED");
    try {
      const response = await fetch(`${API_URL}/api/chat/approvals/${approvalId}/${decision}`, {
        method: "POST",
        headers: authenticatedHeaders({ "Content-Type": "application/json", "x-memory-user-id": memoryUserId }),
        body: JSON.stringify({ reason: decision === "reject" ? "Rejected by user" : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Mission decision failed.");
      if (data?.contentLabExperiment) persistContentLabExperiment(data.contentLabExperiment);
      const content = decision === "reject" ? "Mission rejected. No research actions were executed." : normalizeAssistantReply(data);
      const workspace = decision === "approve" ? resolveWorkspaceFromRoute(data) : null;
      const approvalMessageIndex = messages.findIndex((message) => message.meta?.approval?.id === approvalId);
      const userPrompt = [...messages.slice(0, approvalMessageIndex)].reverse().find((message) => message.role === "user")?.content || data?.research?.query || "";
      const handoffPayload = workspace ? buildHandoffPayload({ userPrompt, assistantReply: content, data, workspace }) : null;
      updateActiveChatMessages((prev) => [...prev.map((message) =>
        message.meta?.approval?.id === approvalId
          ? { ...message, meta: { ...message.meta, awaitingApproval: false, approvalDecision: decision } }
          : message
      ), {
        role: "assistant",
        content,
        meta: {
          source: decision === "reject" ? "MISSION CONTROL" : data?.route || "ASTRAMIND",
          missionId: data?.missionId,
          executionId: data?.executionId,
          planning: data?.planning,
          citations: data?.citations,
          research: data?.research,
          artifact: data?.artifact,
          workspace,
          handoffPayload,
          approvalDecision: decision,
        },
      }]);
      await refreshMissionHistory();
      setStatus(data?.awaitingApproval ? "AWAITING_APPROVAL" : "CONNECTED");
    } catch (error) {
      setNotice(`Mission Control: ${error.message}`);
      setStatus("ERROR");
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    refreshMissionHistory();
  }, [refreshMissionHistory]);

  useEffect(() => {
    setMode(APP_MODES.EXECUTION);
  }, [setMode]);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    }
  }, [activeChatId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (stickToBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, thinking, stickToBottom]);

  const updateActiveChatMessages = (updater) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== activeChatId) return chat;

        const nextMessages =
          typeof updater === "function" ? updater(chat.messages) : updater;

        const firstUserMessage = nextMessages.find(
          (msg) => msg.role === "user"
        );

        return {
          ...chat,
          title:
            chat.title === "New Chat" && firstUserMessage
              ? makeChatTitle(firstUserMessage.content)
              : chat.title,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const startNewChat = () => {
    const newChat = createNewChat();

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput("");
    setNotice("✅ New AstraMind Chat started.");
    setStickToBottom(true);
  };

  const openSavedChat = (chatId) => {
    setActiveChatId(chatId);
    setInput("");
    setNotice("");
    setStickToBottom(true);
  };

  const deleteChat = (chatId) => {
    const ok = window.confirm("Delete this saved chat?");
    if (!ok) return;

    setChats((prev) => {
      const remaining = prev.filter((chat) => chat.id !== chatId);

      if (remaining.length === 0) {
        const replacement = createNewChat();
        setActiveChatId(replacement.id);
        return [replacement];
      }

      if (activeChatId === chatId) {
        setActiveChatId(remaining[0].id);
      }

      return remaining;
    });
  };

  const handleMessagesScroll = () => {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < 90);
  };

  const openWorkspace = ({ workspace, handoffPayload }) => {
    if (!workspace?.path || workspace.path === "/chat") return;

    localStorage.setItem(HANDOFF_KEY, JSON.stringify(handoffPayload));
    setNotice(`✅ Sent to ${workspace.label}. Opening workspace...`);
    navigate(workspace.path);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || thinking || !activeChat) return;

    const userMsg = {
      role: "user",
      content: text,
      meta: { source: "USER" },
    };

    const nextHistory = [...messages, userMsg];

    updateActiveChatMessages(nextHistory);

    setInput("");
    setThinking(true);
    setStickToBottom(true);
    setStatus("THINKING");
    setNotice("");

    logAdaptiveEvent({ type: "CHAT_USED", topic: text });

    try {
      const adaptiveSystem = buildAdaptiveSystemPrompt();

      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: authenticatedHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: text,
          conversationId: activeChat.id,
          userId: memoryUserId,
          history: compactHistoryForApi(nextHistory),
          mode: "CHAT",
          outputMode: selectedOutputMode,
          creator,
          systemPrompt: adaptiveSystem,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Chat request failed.");
      }

      console.log("🧠 FULL RESPONSE:", data);

      const cleanResponse = normalizeAssistantReply(data);

      const suggestedWorkspace = data?.suggestedNextStep
        ? {
            label: normalizeWorkspaceLabel(
              data.suggestedNextStep.label,
              resolveWorkspaceFromRoute(data)?.label || "Workspace"
            ),
            path:
              data.suggestedNextStep.path ||
              resolveWorkspaceFromRoute(data)?.path ||
              "/chat",
            description:
              data.suggestedNextStep.reason ||
              resolveWorkspaceFromRoute(data)?.description ||
              "This request has a suggested workspace.",
            targetSection: data.suggestedNextStep.targetSection,
          }
        : resolveWorkspaceFromRoute(data);

      const workspace =
        suggestedWorkspace?.path === "/chat" ? null : suggestedWorkspace;

      const handoffPayload = buildHandoffPayload({
        userPrompt: text,
        assistantReply: cleanResponse,
        data,
        workspace,
      });

      const assistantMsg = {
        role: "assistant",
        content: cleanResponse,
        meta: {
          source: data?.route || "ASTRAMIND",
          route: data?.route,
          outputMode: data?.outputMode,
          missionId: data?.missionId,
          executionId: data?.executionId,
          classification: data?.classification,
          adaptiveContext: data?.adaptiveContext,
          memory: data?.memory,
          planning: data?.planning,
          citations: data?.citations,
          research: data?.research,
          approval: data?.approval,
          awaitingApproval: data?.awaitingApproval,
          artifact: data?.artifact,
          workspace,
          handoffPayload,
        },
      };

      updateActiveChatMessages((prev) => [...prev, assistantMsg]);
      await refreshMissionHistory();

      if (workspace && shouldAutoPromptWorkspace(workspace)) {
        setTimeout(() => {
          const proceed = window.confirm(
            `${workspace.description}\n\nOpen ${workspace.label}?`
          );

          if (proceed) {
            openWorkspace({ workspace, handoffPayload });
          } else {
            setNotice(
              `Content is ready. Use “Open ${workspace.label}” when ready.`
            );
          }
        }, 250);
      }

      setStatus(data?.awaitingApproval ? "AWAITING_APPROVAL" : "CONNECTED");
    } catch (error) {
      console.error("Chat error:", error);

      updateActiveChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Backend connection failed.\n\n${error.message}`,
          meta: { source: "ERROR" },
        },
      ]);

      setStatus("ERROR");
    } finally {
      setThinking(false);
    }
  };

  const clearCurrentChat = () => {
    const ok = window.confirm("Clear this chat?");
    if (!ok) return;

    updateActiveChatMessages([DEFAULT_MESSAGE]);
    localStorage.removeItem(HANDOFF_KEY);
    localStorage.removeItem("astramind_content_project");

    setNotice("✅ Current chat cleared.");
    setStatus("CONNECTED");
  };

  return (
    <div className="astrachat-page">
      <div className="astrachat-layout">
        <aside className="astrachat-history">
          <div className="astrachat-history-header">
            <div>
              <p className="astrachat-eyebrow">Conversation Vault</p>
              <h2>Saved Chats</h2>
            </div>

            <button
              type="button"
              className="astrachat-icon-btn"
              onClick={startNewChat}
              title="New Chat"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="astrachat-new-btn"
            onClick={startNewChat}
          >
            ✨ New Chat
          </button>

          <div className="astrachat-chat-list">
            {chats.map((chat) => {
              const active = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  className={`astrachat-chat-card ${
                    active ? "astrachat-chat-card-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openSavedChat(chat.id)}
                    className="astrachat-chat-card-main"
                  >
                    <span className="astrachat-chat-title">{chat.title}</span>
                    <span className="astrachat-chat-date">
                      {chat.updatedAt
                        ? new Date(chat.updatedAt).toLocaleString()
                        : "No date"}
                    </span>
                    <span className="astrachat-chat-count">
                      {chat.messages?.length || 0} messages
                    </span>
                  </button>

                  <button
                    type="button"
                    className="astrachat-delete-btn"
                    onClick={() => deleteChat(chat.id)}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="astrachat-main">
          <header className="astrachat-header">
            <div>
              <p className="astrachat-eyebrow">AstraMind Command Layer</p>
              <h1>AstraMind Chat</h1>
              <p className="astrachat-subtitle">
                Clean AI conversation workspace with saved chat history,
                workspace handoff, and routing intelligence.
              </p>
            </div>

            <div className="astrachat-status-grid">
              <div className="astrachat-status-card">
                <span>Status</span>
                <strong className={`status-${status.toLowerCase()}`}>
                  {status}
                </strong>
              </div>

              <div className="astrachat-status-card">
                <span>Mode</span>
                <select
                  value={selectedOutputMode}
                  onChange={(e) => setSelectedOutputMode(e.target.value)}
                >
                  <option value="AUTO">Auto</option>
                  <option value="GENERATOR">Generator</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="CHAT">Chat</option>
                </select>
              </div>

              <div className="astrachat-status-card">
                <span>Messages</span>
                <strong>{messages.length}</strong>
              </div>
            </div>
          </header>

          {notice && <div className="astrachat-notice">{notice}</div>}

          <section className="astrachat-mission-panel" aria-label="Mission history">
            <div className="astrachat-mission-heading">
              <div>
                <p className="astrachat-eyebrow">Kernel lifecycle</p>
                <h2>Recent Missions</h2>
              </div>
              <button
                type="button"
                className="astrachat-mission-refresh"
                onClick={refreshMissionHistory}
                disabled={missionHistoryLoading}
              >
                {missionHistoryLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {missionHistory.length === 0 ? (
              <p className="astrachat-mission-empty">
                Send a message to create the first persisted Kernel mission.
              </p>
            ) : (
              <div className="astrachat-mission-list">
                {missionHistory.map((mission) => (
                  <article className="astrachat-mission-card" key={mission.id}>
                    <div className="astrachat-mission-summary">
                      <span className={`astrachat-mission-status status-${mission.status}`}>
                        {mission.status}
                      </span>
                      <strong>{mission.name}</strong>
                      <time dateTime={mission.updatedAt}>
                        {new Date(mission.updatedAt).toLocaleString()}
                      </time>
                    </div>
                    <div className="astrachat-mission-plan">
                      {(mission.plan || []).map((step, index) => (
                        <span key={step.id || `${mission.id}-${index}`}>
                          {index + 1}. {step.capability} · {step.status}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="astrachat-memory-manager" aria-label="Memory controls">
            <div className="astrachat-mission-heading">
              <div>
                <p className="astrachat-eyebrow">Memory governance</p>
                <h2>Persistent Memory</h2>
              </div>
              <button
                type="button"
                className="astrachat-mission-refresh"
                onClick={async () => {
                  const next = !memoryManagerOpen;
                  setMemoryManagerOpen(next);
                  if (next) await refreshMemories();
                }}
              >
                {memoryManagerOpen ? "Close" : "Manage"}
              </button>
            </div>

            {memoryManagerOpen && (
              <div className="astrachat-memory-content">
                <div className="astrachat-memory-policy">
                  <span>{memoryRetentionDays}-day retention</span>
                  <span>Sensitive values are redacted before storage</span>
                  <button type="button" onClick={clearMemories} disabled={!memories.length}>Clear all</button>
                </div>
                {memoryLoading ? (
                  <p className="astrachat-mission-empty">Loading memories...</p>
                ) : memories.length === 0 ? (
                  <p className="astrachat-mission-empty">No persistent memories stored.</p>
                ) : (
                  <div className="astrachat-memory-list">
                    {memories.map((memory) => (
                      <article key={memory.id} className="astrachat-memory-item">
                        <div>
                          <strong>{memory.role}</strong>
                          <time dateTime={memory.createdAt}>{new Date(memory.createdAt).toLocaleString()}</time>
                        </div>
                        <p>{memory.content}</p>
                        <button type="button" onClick={() => deleteMemory(memory.id)}>Delete</button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="astrachat-panel">
            <div
              className="astrachat-messages"
              ref={listRef}
              onScroll={handleMessagesScroll}
            >
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const isSystem = message.meta?.source === "SYSTEM";
                const isError = message.meta?.source === "ERROR";

                return (
                  <article
                    key={`${message.role}-${index}`}
                    className={`astrachat-message-row ${
                      isUser ? "astrachat-message-user" : "astrachat-message-ai"
                    }`}
                  >
                    <div
                      className={`astrachat-bubble ${
                        isUser
                          ? "bubble-user"
                          : isError
                          ? "bubble-error"
                          : isSystem
                          ? "bubble-system"
                          : "bubble-ai"
                      }`}
                    >
                      <div className="astrachat-bubble-top">
                        <span className="astrachat-source-pill">
                          {sourceLabel(message)}
                        </span>

                        {message.meta?.outputMode && (
                          <span className="astrachat-mini-pill">
                            {message.meta.outputMode}
                          </span>
                        )}

                        {message.meta?.missionId && (
                          <span className="astrachat-mission-pill">
                            Mission {message.meta.missionId.slice(0, 8)}
                          </span>
                        )}

                        {message.meta?.classification?.intent?.primaryAgent && (
                          <span className="astrachat-intent-pill">
                            Intent: {message.meta.classification.intent.primaryAgent}
                            {Number.isFinite(message.meta.classification.intent.confidence)
                              ? ` · ${Math.round(message.meta.classification.intent.confidence * 100)}%`
                              : ""}
                          </span>
                        )}

                        {message.meta?.adaptiveContext?.stats && (
                          <span className="astrachat-context-pill">
                            Context: {message.meta.adaptiveContext.stats.recentMessages} recent
                            {message.meta.adaptiveContext.stats.compressedMessages > 0
                              ? ` · ${message.meta.adaptiveContext.stats.compressedMessages} compressed`
                              : ""}
                          </span>
                        )}

                        {message.meta?.memory && (
                          <span className="astrachat-memory-pill">
                            Memory: {message.meta.memory.recalled} recalled · {message.meta.memory.stored} stored
                          </span>
                        )}

                        {message.meta?.planning?.template && (
                          <span className="astrachat-plan-pill">
                            Plan: {message.meta.planning.template}
                          </span>
                        )}

                        {message.meta?.workspace && (
                          <span className="astrachat-workspace-pill">
                            Suggested: {message.meta.workspace.label}
                          </span>
                        )}
                      </div>

                      <div className="astrachat-bubble-content">
                        {message.content}
                      </div>

                      {message.meta?.citations?.length > 0 && (
                        <div className="astrachat-citations">
                          <strong>Validated sources</strong>
                          {message.meta.citations.map((citation, citationIndex) => (
                            <a key={`${citation.url}-${citationIndex}`} href={citation.url} target="_blank" rel="noreferrer">
                              {citation.title} · {citation.publisher}
                            </a>
                          ))}
                        </div>
                      )}

                      {message.meta?.awaitingApproval && message.meta?.approval?.id && (
                        <div className="astrachat-approval-controls">
                          <div>
                            <strong>Approval required</strong>
                            <span>{message.meta.approval.reason || message.meta.approval.planning?.approval?.reason}</span>
                          </div>
                          <button type="button" onClick={() => decideMission(message.meta.approval.id, "approve")}>Approve & run</button>
                          <button type="button" className="reject" onClick={() => decideMission(message.meta.approval.id, "reject")}>Reject</button>
                        </div>
                      )}

                      {message.meta?.artifact?.id && (
                        <div className="astrachat-artifact-notice">
                          Research artifact saved: {message.meta.artifact.title}
                        </div>
                      )}

                      {message.meta?.workspace &&
                        message.meta.workspace.path !== "/chat" && (
                          <button
                            type="button"
                            className="astrachat-handoff-btn"
                            onClick={() =>
                              openWorkspace({
                                workspace: message.meta.workspace,
                                handoffPayload: message.meta.handoffPayload,
                              })
                            }
                          >
                            Open {message.meta.workspace.label}
                          </button>
                        )}
                    </div>
                  </article>
                );
              })}

              {thinking && (
                <article className="astrachat-message-row astrachat-message-ai">
                  <div className="astrachat-bubble bubble-thinking">
                    <div className="astrachat-thinking-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <p>AstraMind is thinking...</p>
                  </div>
                </article>
              )}
            </div>

            <footer className="astrachat-composer">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AstraMind anything..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <div className="astrachat-composer-actions">
                <button
                  type="button"
                  className="astrachat-send-btn"
                  onClick={sendMessage}
                  disabled={thinking || !input.trim()}
                >
                  {thinking ? "..." : "Send"}
                </button>

                <button
                  type="button"
                  className="astrachat-clear-btn"
                  onClick={clearCurrentChat}
                >
                  Clear
                </button>
              </div>

              <div className="astrachat-shortcuts">
                <span>Enter = send</span>
                <span>Shift + Enter = new line</span>
                <span>Chats saved locally</span>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}





