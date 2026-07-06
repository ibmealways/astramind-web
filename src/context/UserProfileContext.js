import React, { createContext, useContext, useState, useEffect } from "react";

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const [profile, setProfile] = useState({
    name: "Operator",
    role: "Creator",
    theme: "dark",
    preferences: {},
  });

  useEffect(() => {
    const stored = localStorage.getItem("astramind_profile");
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("astramind_profile", JSON.stringify(profile));
  }, [profile]);

  const updateProfile = (updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const resetProfile = () => {
    localStorage.removeItem("astramind_profile");
    setProfile({
      name: "Operator",
      role: "Creator",
      theme: "dark",
      preferences: {},
    });
  };

  const value = {
    profile,
    updateProfile,
    resetProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used inside UserProfileProvider");
  }
  return ctx;
}
