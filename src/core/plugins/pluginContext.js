import { createContext, useContext } from "react";
import { registerPlugin, runPlugin } from "../core/plugins/pluginManager.js";

const PluginContext = createContext();

export function PluginProvider({ children }) {
  return (
    <PluginContext.Provider value={{ registerPlugin, runPlugin }}>
      {children}
    </PluginContext.Provider>
  );
}

export const usePlugins = () => useContext(PluginContext);
