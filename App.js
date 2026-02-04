import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import Finance from "./pages/Finance";
import ContentCreation from "./pages/ContentCreation";
import Home from "./pages/Home";
import "./styles/index.css";

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