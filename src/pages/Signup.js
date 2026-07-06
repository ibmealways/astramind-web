import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signup({ name, email, password });
      navigate("/control-center", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px", color: "white" }}>
      <h1>Create AstraMind Account</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: "420px", display: "grid", gap: "12px" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        {error ? <div>{error}</div> : null}
      </form>
      <p style={{ marginTop: "16px" }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}