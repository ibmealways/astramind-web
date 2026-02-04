// src/pages/ContentCreation.js
import React from "react";

const ContentCreation = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 text-white p-6">
      <div className="max-w-5xl mx-auto bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-purple-500">
        <h1 className="text-4xl font-extrabold text-purple-400 mb-4 drop-shadow">
          🎨 Content Creation
        </h1>
        <p className="text-lg text-gray-300 mb-6">
          Design, edit, and manage stunning content with AstraMind.
        </p>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700 hover:shadow-purple-500/30 hover:scale-105 transition">
            <h2 className="text-xl font-semibold mb-2">🖼️ Image Editor</h2>
            <p className="text-sm text-gray-400">
              Enhance, crop, or redesign visuals for any platform.
            </p>
          </div>
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700 hover:shadow-purple-500/30 hover:scale-105 transition">
            <h2 className="text-xl font-semibold mb-2">🎞️ Video Tools</h2>
            <p className="text-sm text-gray-400">
              Trim, add effects, and export high-quality videos.
            </p>
          </div>
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700 hover:shadow-purple-500/30 hover:scale-105 transition">
            <h2 className="text-xl font-semibold mb-2">🎤 Audio Creator</h2>
            <p className="text-sm text-gray-400">
              Compose or refine music, podcasts, and voiceovers.
            </p>
          </div>
          <div className="bg-black/30 p-6 rounded-xl border border-gray-700 hover:shadow-purple-500/30 hover:scale-105 transition">
            <h2 className="text-xl font-semibold mb-2">📝 Script Generator</h2>
            <p className="text-sm text-gray-400">
              Write video scripts, ads, or storytelling content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentCreation;