import React from "react";
import { BrowserRouter } from "react-router-dom";

import AppRoutes from "./AppRoutes.js";

/* PROVIDERS */
import { ModeProvider } from "./context/ModeContext.js";
import { AdaptiveProvider } from "./context/AdaptiveContext.js";
import { MemoryProvider } from "./context/MemoryContext.js";
import { TaskProvider } from "./context/TaskContext.js";
import { SchedulerProvider } from "./context/SchedulerContext.js";
import { PluginProvider } from "./context/PluginContext.js";

/* UI COMPONENTS */
import Sidebar from "./components/Sidebar.js";
import AmbientLayer from "./components/AmbientLayer.js";
import ModeSync from "./components/ModeSync.js";
import CommandPalette from "./components/CommandPalette.js";
import FloatingChappy from "./components/FloatingChappy.js";
import VoiceListener from "./components/VoiceListener.js";

/* STYLES */
import "./styles/index.css";
import "./styles/App.css";

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ModeProvider>
        <AdaptiveProvider>
          <MemoryProvider>
            <TaskProvider>
              <SchedulerProvider>
                <PluginProvider>
                  <ModeSync />
                  <CommandPalette />
                  <FloatingChappy />
                  <VoiceListener />

                  <div className="app-layout">
                    <Sidebar />

                    <main className="main-content">
                      <AmbientLayer />
                      <div className="main-scroll-area">
                        <AppRoutes />
                      </div>
                    </main>
                  </div>
                </PluginProvider>
              </SchedulerProvider>
            </TaskProvider>
          </MemoryProvider>
        </AdaptiveProvider>
      </ModeProvider>
    </BrowserRouter>
  );
}