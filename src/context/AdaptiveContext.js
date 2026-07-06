import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { APP_MODES, getModeConfig } from "../config/modeConfig.js";

const AdaptiveContext = createContext(null);

const STORAGE_KEY = "astramind_adaptive_context";

const DEFAULT_STATE = {
  mode: APP_MODES.CREATOR,
  lastRoute: "/",
  usage: {
    chatCount: 0,
    financeVisits: 0,
    contentVisits: 0,
    settingsVisits: 0,
    bookWriterVisits: 0,
  },
  preferences: {
    autoSuggestModeSwitch: true,
    prioritizeCreatorTools: true,
    compactSidebarByDefault: false,
  },
  suggestions: [],
};

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function buildSuggestions(state) {
  const suggestions = [];

  if (state.usage.contentVisits >= 5 && state.mode !== APP_MODES.CREATOR) {
    suggestions.push({
      id: "switch-to-creator",
      type: "mode-switch",
      title: "Switch to Creator Mode",
      description: "You’ve been working heavily in content modules. Creator Mode may fit better.",
      targetMode: APP_MODES.CREATOR,
    });
  }

  if (state.usage.financeVisits >= 3 && state.mode !== APP_MODES.FINANCE) {
    suggestions.push({
      id: "switch-to-finance",
      type: "mode-switch",
      title: "Switch to Finance Mode",
      description: "You’ve been opening finance tools frequently. Finance Mode can streamline those workflows.",
      targetMode: APP_MODES.FINANCE,
    });
  }

  if (state.usage.bookWriterVisits >= 3 && state.mode !== APP_MODES.DEEP_WORK) {
    suggestions.push({
      id: "switch-to-deep-work",
      type: "mode-switch",
      title: "Switch to Deep Work Mode",
      description: "You’ve been using Book Writer repeatedly. Deep Work Mode reduces distractions.",
      targetMode: APP_MODES.DEEP_WORK,
    });
  }

  if (state.usage.chatCount >= 10 && state.mode === APP_MODES.FOCUS) {
    suggestions.push({
      id: "expand-to-execution",
      type: "mode-switch",
      title: "Switch to Execution Mode",
      description: "Your activity suggests broader system usage may help you move faster.",
      targetMode: APP_MODES.EXECUTION,
    });
  }

  return suggestions;
}

export function AdaptiveProvider({ children }) {
  const [state, setState] = useState(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY), null);
    return saved || DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      suggestions: buildSuggestions(prev),
    }));
  }, [
    state.mode,
    state.usage.chatCount,
    state.usage.financeVisits,
    state.usage.contentVisits,
    state.usage.settingsVisits,
    state.usage.bookWriterVisits,
  ]);

  const setMode = (modeKey) => {
    const nextMode = getModeConfig(modeKey);
    setState((prev) => ({
      ...prev,
      mode: modeKey,
      suggestions: prev.suggestions.filter(
        (suggestion) => suggestion.targetMode !== modeKey
      ),
      lastSuggestedModeLabel: nextMode.label,
    }));
  };

  const setLastRoute = (route) => {
    setState((prev) => ({
      ...prev,
      lastRoute: route,
    }));
  };

  const trackRouteVisit = (route) => {
    setState((prev) => {
      const nextUsage = { ...prev.usage };

      if (route.startsWith("/finance")) {
        nextUsage.financeVisits += 1;
      }

      if (route.startsWith("/content")) {
        nextUsage.contentVisits += 1;
      }

      if (route === "/settings") {
        nextUsage.settingsVisits += 1;
      }

      if (route === "/content/book") {
        nextUsage.bookWriterVisits += 1;
      }

      return {
        ...prev,
        lastRoute: route,
        usage: nextUsage,
      };
    });
  };

  const incrementChatCount = () => {
    setState((prev) => ({
      ...prev,
      usage: {
        ...prev.usage,
        chatCount: prev.usage.chatCount + 1,
      },
    }));
  };

  const updatePreferences = (partialPreferences) => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        ...partialPreferences,
      },
    }));
  };

  const dismissSuggestion = (suggestionId) => {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.filter(
        (suggestion) => suggestion.id !== suggestionId
      ),
    }));
  };

  const resetAdaptiveState = () => {
    setState(DEFAULT_STATE);
  };

  const value = useMemo(() => {
    const activeModeConfig = getModeConfig(state.mode);

    return {
      state,
      activeMode: state.mode,
      activeModeConfig,
      suggestions: state.suggestions,
      setMode,
      setLastRoute,
      trackRouteVisit,
      incrementChatCount,
      updatePreferences,
      dismissSuggestion,
      resetAdaptiveState,
    };
  }, [state]);

  return (
    <AdaptiveContext.Provider value={value}>
      {children}
    </AdaptiveContext.Provider>
  );
}

export function useAdaptive() {
  const context = useContext(AdaptiveContext);

  if (!context) {
    throw new Error("useAdaptive must be used within an AdaptiveProvider");
  }

  return context;
}

export default AdaptiveContext;