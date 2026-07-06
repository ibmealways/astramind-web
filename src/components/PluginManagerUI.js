import { usePlugins } from "../context/PluginContext.jsS";

export default function PluginManagerUI() {
  const { runPlugin } = usePlugins();

  return (
    <button onClick={() => runPlugin("example", {})}>
      Run Plugin
    </button>
  );
}
