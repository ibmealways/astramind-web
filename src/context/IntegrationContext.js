// src/context/IntegrationContext.js
import React, { createContext, useContext, useEffect, useState } from "react";

const IntegrationContext = createContext();

const STORAGE_KEY = "astramind_integrations_v1";

export function IntegrationProvider({ children }) {
  const [integrations, setIntegrations] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }

    return {
      chat: true,
      finance: true,
      content: true,
      lab: true,
      adaptiveLearning: true,
      cloudAI: true,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(integrations));
  }, [integrations]);

  const toggleIntegration = (key) => {
    setIntegrations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const enableAll = () => {
    setIntegrations({
      chat: true,
      finance: true,
      content: true,
      lab: true,
      adaptiveLearning: true,
      cloudAI: true,
    });
  };

  const disableAll = () => {
    setIntegrations({
      chat: false,
      finance: false,
      content: false,
      lab: false,
      adaptiveLearning: false,
      cloudAI: false,
    });
  };

  return (
    <IntegrationContext.Provider
      value={{
        integrations,
        toggleIntegration,
        enableAll,
        disableAll,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegration() {
  return useContext(IntegrationContext);
}
