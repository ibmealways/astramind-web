import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  /*
    Important fix:
    If the user is already authenticated, NEVER replace the page with
    "Checking session..." during a background auth refresh.

    Before, this component unmounted ContentVideo while AstraMind was rendering,
    which wiped videoUrl/result state and made the screen jump back.
  */
  if (isAuthenticated) {
    return children;
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "white" }}>
        Checking session...
      </div>
    );
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
}