import { PLUGINS } from "./pluginRegistry.js";

export function registerPlugin(plugin) {
  PLUGINS[plugin.name] = plugin;
  plugin.init?.();
}

export function runPlugin(name, payload) {
  return PLUGINS[name]?.run(payload);
}
