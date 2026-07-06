import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/chat.css";

import { useOSMode } from "../context/ModeContext.js";
import { APP_MODES } from "../config/modeConfig.js";
import { loadCreatorMemory } from "../core/memory/creatorMemory.js";

import {
  buildAdaptiveSystemPrompt,
  logAdaptiveEvent,
} from "../core/adaptive/adaptiveEngine.js";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const HANDOFF_KEY = "astramind_handoff";
const CHAT_STORE_KEY = "astramind_saved_chats";
const ACTIVE_CHAT_KEY = "astramind_active_chat_id";

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
    label: "Content Creator",
    path: "/content",
    description:
      "This request is best continued in the Content Creation workspace.",
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

function makeChatTitle(text = "") {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return "New Chat";
  return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function normalizeAssistantReply(data) {
  if (typeof data === "string") return data;

  return (
    data?.reply ||
    data?.script ||
    data?.content ||
    data?.analysis ||
    data?.result ||
    data?.message ||
    "⚠️ No response generated."
  );
}

function resolveWorkspaceFromRoute(data) {
  const route = String(data?.route || "").toLowerCase();
  const path = String(data?.suggestedNextStep?.path || "").toLowerCase();

  if (route.includes("book") || path.includes("/content/book")) {
    return WORKSPACE_MAP.book;
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
  const listRef = useRef(null);

  const [status, setStatus] = useState("CONNECTED");
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [stickToBottom, setStickToBottom] = useState(true);
  const [selectedOutputMode, setSelectedOutputMode] = useState("AUTO");
  const [notice, setNotice] = useState("");

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

  const messages = activeChat?.messages || [DEFAULT_MESSAGE];

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: nextHistory.slice(-20),
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
            label:
              data.suggestedNextStep.label ||
              resolveWorkspaceFromRoute(data)?.label ||
              "Workspace",
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
          workspace,
          handoffPayload,
        },
      };

      updateActiveChatMessages((prev) => [...prev, assistantMsg]);

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

      setStatus("CONNECTED");
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

                        {message.meta?.workspace && (
                          <span className="astrachat-workspace-pill">
                            Suggested: {message.meta.workspace.label}
                          </span>
                        )}
                      </div>

                      <div className="astrachat-bubble-content">
                        {message.content}
                      </div>

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





