import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.js";
import Sidebar from "./components/Sidebar.js";
import Settings from "./pages/Settings.js";
import Chat from "./pages/Chat.js";
import Finance from "./pages/Finance.js";
import ContentCreation from "./pages/ContentCreation.js";
import Home from "./pages/Home.js";
import "./styles/index.css"; // ✅ Corrected import

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/content" element={<ContentCreation />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;

