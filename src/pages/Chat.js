//src/pages/Chat.js
import React, { useState } from "react";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (input.trim() === "") return;

    const userMsg = { type: "user", text: input };
    const botMsg = {
      type: "bot",
      text: "🤖 I'm AstraMind — how can I help you today?",
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-slate-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-700 p-6">
        <h1 className="text-4xl font-bold text-center text-cyan-400 mb-6 drop-shadow">
          💬 AstraMind Chat
        </h1>

        <div className="overflow-y-auto h-[400px] bg-black/30 border border-gray-600 rounded-lg p-4 mb-4 space-y-3">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-xl max-w-[80%] ${
                msg.type === "user"
                  ? "bg-cyan-500 text-white self-end ml-auto"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 p-3 rounded-lg bg-gray-900 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
