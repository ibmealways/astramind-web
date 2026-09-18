import { API_URL as DEFAULT_API_URL } from "../config/api.js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "astramind_token";
const USER_KEY = "aigenikz_session_user";

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getApiUrl() {
  return localStorage.getItem("astramind_api_url") || DEFAULT_API_URL;
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const response = await fetch(`${getApiUrl()}/api/auth/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await readJson(response);
        const restoredToken = data.token || token;
        if (restoredToken) {
          setToken(restoredToken);
          localStorage.setItem(TOKEN_KEY, restoredToken);
        }
        setUser(data.user || null);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user || null));
      } catch (error) {
        if (error?.status === 401) {
          clearSession();
          setToken("");
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),

    async signup(payload) {
      const response = await fetch(`${getApiUrl()}/api/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJson(response);

      saveSession(data.token, data.user);
      setToken(data.token);
      setUser(data.user);

      return data;
    },

    async login(payload) {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJson(response);

      saveSession(data.token, data.user);
      setToken(data.token);
      setUser(data.user);

      return data;
    },

    logout() {
      fetch(`${getApiUrl()}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
      clearSession();
      setToken("");
      setUser(null);
    },
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;

}
