import React from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.js";

import Home from "./pages/Home.js";
import Chat from "./pages/Chat.js";
import Finance from "./pages/Finance.js";
import ContentCreation from "./pages/ContentCreation.js";
import ContentLab from "./pages/ContentLab.js";
import ExperimentLab from "./pages/ExperimentLab.js";
import ResearchWorkspace from "./pages/ResearchWorkspace.js";
import Settings from "./pages/Settings.js";

import CreatorSetup from "./pages/CreatorSetup.js";
import CreatorDashboard from "./pages/CreatorDashboard.js";

import FinanceIncome from "./pages/modules/FinanceIncome.js";
import FinanceExpenses from "./pages/modules/FinanceExpenses.js";
import FinanceSavings from "./pages/modules/FinanceSavings.js";

import ContentImage from "./pages/modules/ContentImage.js";
import ContentVideo from "./pages/modules/ContentVideo.js";
import ContentAudio from "./pages/modules/ContentAudio.js";
import ContentScript from "./pages/modules/ContentScript.js";
import ContentBook from "./pages/modules/ContentBook.js";

import ControlCenter from "./pages/ControlCenter.js";
import OperatorDashboard from "./pages/OperatorDashboard.js";

import Login from "./pages/Login.js";
import Signup from "./pages/Signup.js";
import Pricing from "./pages/Pricing.js";
import BillingResult from "./pages/BillingResult.js";

export default function AppRoutes() {
  return (
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* CORE */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/research"
        element={
          <ProtectedRoute>
            <ResearchWorkspace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/control-center"
        element={
          <ProtectedRoute>
            <ControlCenter />
          </ProtectedRoute>
        }
      />

      <Route
        path="/operator-dashboard"
        element={
          <ProtectedRoute>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />

      {/* FINANCE OS */}
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/income"
        element={
          <ProtectedRoute>
            <FinanceIncome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/expenses"
        element={
          <ProtectedRoute>
            <FinanceExpenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/savings"
        element={
          <ProtectedRoute>
            <FinanceSavings />
          </ProtectedRoute>
        }
      />

      {/* CONTENT CREATION OS */}
      <Route
        path="/content"
        element={
          <ProtectedRoute>
            <ContentCreation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/content-lab"
        element={
          <ProtectedRoute>
            <ExperimentLab />
          </ProtectedRoute>
        }
      />

      <Route
        path="/content-lab/latest"
        element={
          <ProtectedRoute>
            <ExperimentLab />
          </ProtectedRoute>
        }
      />

      <Route
        path="/content-lab/:projectId"
        element={
          <ProtectedRoute>
            <ContentLab />
          </ProtectedRoute>
        }
      />

      <Route
        path="/content/image"
        element={
          <ProtectedRoute>
            <ContentImage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content/video"
        element={
          <ProtectedRoute>
            <ContentVideo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content/audio"
        element={
          <ProtectedRoute>
            <ContentAudio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content/script"
        element={
          <ProtectedRoute>
            <ContentScript />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content/book"
        element={
          <ProtectedRoute>
            <ContentBook />
          </ProtectedRoute>
        }
      />

      {/* CREATOR */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <CreatorSetup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/creator-dashboard"
        element={
          <ProtectedRoute>
            <CreatorDashboard />
          </ProtectedRoute>
        }
      />

      {/* SETTINGS */}
      <Route path="/billing/success" element={<ProtectedRoute><BillingResult /></ProtectedRoute>} />
      <Route path="/billing/cancelled" element={<ProtectedRoute><BillingResult cancelled /></ProtectedRoute>} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
