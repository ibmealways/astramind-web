import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-900 text-white font-sans p-6">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-md text-amber-400">
          🚀 Welcome to AstraMind
        </h1>
        <p className="text-lg text-gray-300 mt-3">
          The Ultimate AI-Powered All-in-One App
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Link to="/chat" className="bg-indigo-700 bg-opacity-30 border border-indigo-500 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-pink-300 mb-2">🤖 AI Chat</h2>
          <p className="text-sm text-gray-300">Talk to AstraMind in real time.</p>
        </Link>

        <Link to="/finance" className="bg-indigo-700 bg-opacity-30 border border-indigo-500 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-green-300 mb-2">💰 Finance</h2>
          <p className="text-sm text-gray-300">Track your income, expenses, and savings.</p>
        </Link>

        <Link to="/content" className="bg-indigo-700 bg-opacity-30 border border-indigo-500 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-yellow-300 mb-2">🎨 Content Creation</h2>
          <p className="text-sm text-gray-300">Design, edit, and manage media effortlessly.</p>
        </Link>

        <Link to="/settings" className="bg-indigo-700 bg-opacity-30 border border-indigo-500 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-blue-300 mb-2">⚙️ Settings</h2>
          <p className="text-sm text-gray-300">Customize AstraMind’s style and features.</p>
        </Link>
      </div>

      <footer className="text-center text-xs text-gray-500 mt-16">
        © {new Date().getFullYear()} AstraMind — All rights reserved.
      </footer>
    </div>
  );
};

export default Home;