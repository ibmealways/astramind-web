import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { APP_MODES, getModeConfig, getAllModes } from "../config/modeConfig.js";

const ModeContext = createContext(null);

const STORAGE_KEY = "astramind_os_mode";

export const OS_MODES = APP_MODES;

function getInitialMode() {
  try {
    const savedMode = localStorage.getItem(STORAGE_KEY);

    if (savedMode && getModeConfig(savedMode)) {
      return savedMode;
    }
  } catch (error) {
    console.warn("Unable to read saved AstraMind mode from storage.", error);
  }

  return APP_MODES.CREATOR;
}

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(getInitialMode);
  const [previousMode, setPreviousMode] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.warn("Unable to save AstraMind mode to storage.", error);
    }
  }, [mode]);

  const setMode = useCallback((nextMode) => {
    const config = getModeConfig(nextMode);

    if (!config) {
      console.warn(`Attempted to set invalid AstraMind mode: ${nextMode}`);
      return;
    }

    setPreviousMode(mode);
    setModeState(nextMode);
  }, [mode]);

  const resetMode = useCallback(() => {
    setPreviousMode(mode);
    setModeState(APP_MODES.CREATOR);
  }, [mode]);

  const toggleExecutionMode = useCallback(() => {
    setPreviousMode(mode);
    setModeState((currentMode) =>
      currentMode === APP_MODES.EXECUTION
        ? APP_MODES.CREATOR
        : APP_MODES.EXECUTION
    );
  }, [mode]);

  const restorePreviousMode = useCallback(() => {
    if (!previousMode) return;
    setModeState(previousMode);
  }, [previousMode]);

  const value = useMemo(() => {
    const activeModeConfig = getModeConfig(mode);
    const allModes = getAllModes();

    return {
      mode,
      currentMode: mode,
      previousMode,
      setMode,
      resetMode,
      restorePreviousMode,
      toggleExecutionMode,

      activeModeConfig,
      modeLabel: activeModeConfig.label,
      modeDescription: activeModeConfig.description,
      modeAccent: activeModeConfig.accent,
      defaultRoute: activeModeConfig.defaultRoute,
      enabledModules: activeModeConfig.enabledModules,
      aiWorkflow: activeModeConfig.aiWorkflow,

      allModes,
      isCreatorMode: mode === APP_MODES.CREATOR,
      isFocusMode: mode === APP_MODES.FOCUS,
      isFinanceMode: mode === APP_MODES.FINANCE,
      isExecutionMode: mode === APP_MODES.EXECUTION,
      isDeepWorkMode: mode === APP_MODES.DEEP_WORK,
    };
  }, [mode, previousMode, resetMode, restorePreviousMode, setMode, toggleExecutionMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useOSMode() {
  const context = useContext(ModeContext);

  if (!context) {
    throw new Error("useOSMode must be used within a ModeProvider");
  }

  return context;
}

export default ModeContext;
