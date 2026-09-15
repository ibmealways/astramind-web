import { useState } from "react";
import { saveCreatorMemory } from "../core/memory/creatorMemory.js";
import { useNavigate } from "react-router-dom";

export default function CreatorSetup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    niche: "",
    platform: "TikTok",
    tone: "Educational",
    goal: ""
  });

  const submit = () => {
    if (!form.niche || !form.goal) {
      alert("Please complete all fields");
      return;
    }

    saveCreatorMemory(form);
    navigate("/");
  };

  return (
    <div className="os-panel os-page-enter os-breathe w-full h-full flex items-center justify-center text-white">

      <div
        className="
          w-full max-w-md
          bg-white/5
          backdrop-blur-xl
          p-8
          rounded-2xl
          border border-white/10
          shadow-[0_0_40px_rgba(99,102,241,0.25)]
        "
      >
        <h1 className="text-2xl font-extrabold mb-2 text-indigo-400">
          🚀 Initialize Aigenikz
        </h1>

        <p className="text-sm text-gray-300 mb-6">
          Define your creator identity so Aigenikz can align its intelligence.
        </p>

        {/* NICHE */}
        <input
          className="os-input mb-3"
          placeholder="Your niche (e.g. News, Finance, Fitness)"
          value={form.niche}
          onChange={(e) => setForm({ ...form, niche: e.target.value })}
        />

        {/* PLATFORM */}
        <select
          className="os-select mb-3"
          value={form.platform}
          onChange={(e) => setForm({ ...form, platform: e.target.value })}
        >
          <option>TikTok</option>
          <option>Instagram</option>
          <option>YouTube</option>
        </select>

        {/* TONE */}
        <select
          className="os-select mb-3"
          value={form.tone}
          onChange={(e) => setForm({ ...form, tone: e.target.value })}
        >
          <option>Educational</option>
          <option>Entertaining</option>
          <option>Bold</option>
          <option>Calm</option>
        </select>

        {/* GOAL */}
        <input
          className="os-input mb-6"
          placeholder="Primary goal (growth, monetization, authority)"
          value={form.goal}
          onChange={(e) => setForm({ ...form, goal: e.target.value })}
        />

        <button
          onClick={submit}
          className="
            w-full
            bg-indigo-600
            hover:bg-indigo-700
            py-2
            rounded-lg
            font-semibold
            shadow-[0_0_25px_rgba(99,102,241,0.4)]
            transition
          "
        >
          Initialize Aigenikz
        </button>
      </div>
    </div>
  );
}

