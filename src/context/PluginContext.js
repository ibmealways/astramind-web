import { createContext, useContext } from "react";

const PluginContext = createContext();

export function PluginProvider({ children }) {
  const registerPlugin = () => {};
  const runPlugin = () => {};

  return (
    <PluginContext.Provider value={{ registerPlugin, runPlugin }}>
      {children}
    </PluginContext.Provider>
  );
}

export function usePlugins() {
  return useContext(PluginContext);
}
