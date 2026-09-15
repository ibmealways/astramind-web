import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const destination = location.state?.from?.pathname || "/control-center";

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ email, password });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "40px", color: "white" }}>
      <h1>Login to Aigenikz</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: "420px", display: "grid", gap: "12px" }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {error ? <div>{error}</div> : null}
      </form>
      <p style={{ marginTop: "16px" }}>
        No account yet? <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
}