import { detectAgentIntent } from "../agents/agentRouter.js";

const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function getApiUrl() {
  return typeof localStorage !== "undefined"
    ? localStorage.getItem("astramind_api_url") || DEFAULT_API_URL
    : DEFAULT_API_URL;
}

async function readJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Workflow request failed.");
  }
  return data;
}

async function runResearchSummaryWorkflow(input) {
  const response = await fetch(
    `${getApiUrl()}/api/agent-workflow/research-summary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` },
      body: JSON.stringify({ input }),
    }
  );

  return readJson(response);
}

async function runBusinessStrategyWorkflow(input) {
  const response = await fetch(
    `${getApiUrl()}/api/agent-workflow/business-strategy-scan`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` },
      body: JSON.stringify({ input }),
    }
  );

  return readJson(response);
}

async function runSaasBuilderWorkflow({
  input,
  audience = "General audience",
  tone = "Bold",
}) {
  const response = await fetch(`${getApiUrl()}/api/saas-builder/blueprint`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("astramind_token") || ""}` },
    body: JSON.stringify({
      input,
      audience,
      tone,
    }),
  });

  return readJson(response);
}

export async function runAutonomousWorkflow(input, options = {}) {
  const intent = detectAgentIntent(input);

  if (!intent.workflow) {
    return {
      ok: true,
      routed: true,
      workflowExecuted: false,
      intent,
      result: null,
    };
  }

  if (intent.workflow === "research_summary") {
    const data = await runResearchSummaryWorkflow(input);
    return {
      ok: true,
      routed: true,
      workflowExecuted: true,
      intent,
      result: data,
    };
  }

  if (intent.workflow === "business_strategy_scan") {
    const data = await runBusinessStrategyWorkflow(input);
    return {
      ok: true,
      routed: true,
      workflowExecuted: true,
      intent,
      result: data,
    };
  }

  if (intent.workflow === "saas_builder") {
    const data = await runSaasBuilderWorkflow({
      input,
      audience: options.audience,
      tone: options.tone,
    });

    return {
      ok: true,
      routed: true,
      workflowExecuted: true,
      intent,
      result: data,
    };
  }

  return {
    ok: true,
    routed: true,
    workflowExecuted: false,
    intent,
    result: null,
  };
}

export async function runWorkflow(workflowType, input = {}) {
  if (workflowType === "kernel.echo" || workflowType === "general") {
    return { workflowType, input };
  }
  if (workflowType === "research_summary") return runResearchSummaryWorkflow(input);
  if (workflowType === "business_strategy_scan") return runBusinessStrategyWorkflow(input);
  if (workflowType === "saas_builder") return runSaasBuilderWorkflow({ input });
  const error = new Error(`Unsupported workflow: ${workflowType}`);
  error.code = "WORKFLOW_NOT_FOUND";
  error.status = 404;
  throw error;
}
