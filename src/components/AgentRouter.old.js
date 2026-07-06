import { AGENTS } from "../core/agents/agentRegistry.js";

export function routeToAgent(mode, message) {
  return AGENTS[mode]
    ? AGENTS[mode](message)
    : AGENTS.builder(message);
}
