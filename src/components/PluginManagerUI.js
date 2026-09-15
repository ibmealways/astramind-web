import { usePlugins } from "../context/PluginContext.js";

export default function PluginManagerUI() {
  const { runPlugin } = usePlugins();

  return (
    <button onClick={() => runPlugin("example", {})}>
      Run Plugin
    </button>
  );
}
