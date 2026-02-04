
import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-700 shadow-md p-4 flex justify-between items-center z-50">
      <div className="text-2xl font-bold text-white tracking-wide">AstraMind</div>
      <div className="space-x-6 text-white font-medium text-lg">
        <Link to="/" className="hover:text-yellow-300 transition duration-200">Home</Link>
        <Link to="/chat" className="hover:text-yellow-300 transition duration-200">Chat</Link>
        <Link to="/finance" className="hover:text-yellow-300 transition duration-200">Finance</Link>
        <Link to="/content" className="hover:text-yellow-300 transition duration-200">Content</Link>
        <Link to="/settings" className="hover:text-yellow-300 transition duration-200">Settings</Link>
      </div>
    </nav>
  );
};

export default Navbar;
