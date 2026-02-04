// src/pages/Settings.js
import React from "react";

const Settings = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-6">
      <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-yellow-300">
        <h1 className="text-4xl font-extrabold text-yellow-300 mb-4 drop-shadow">
          ⚙️ Settings
        </h1>
        <p className="text-lg text-gray-300 mb-6">
          Adjust AstraMind's behavior, style, and preferences.
        </p>

        {/* Preferences Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme */}
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-2">🎨 Theme</h2>
            <select className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-2">🔔 Notifications</h2>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="form-checkbox accent-yellow-500" defaultChecked />
              <span>Enable Alerts</span>
            </label>
          </div>

          {/* Assistant Voice */}
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-2">🎤 Voice Assistant</h2>
            <select className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600">
              <option value="astro">Astra (Default)</option>
              <option value="nova">Nova</option>
              <option value="zen">Zen</option>
            </select>
          </div>

          {/* Language */}
          <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-2">🌐 Language</h2>
            <select className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
