import React, { useEffect, useMemo, useState } from "react";
import "../styles/experiment-lab.css";
import { loadContentLabExperiments, persistContentLabExperiment } from "../services/contentLabExperimentService.js";
import { buildProductFormulationProposal, calculateFormulationBatch } from "../core/research/ProductFormulationEngine.js";
import { apiFetch } from "../services/apiClient.js";
import { clearContentLabDialogue, loadContentLabDialogue, saveContentLabDialogue } from "../services/contentLabDialogueService.js";

const STORAGE_KEY = "astramind_experiments";
const HANDOFF_KEY = "astramind_handoff";
const DOMAINS = [
  { id: "science", icon: "⚗️", label: "Science", description: "Test hypotheses, variables, methods, and expected observations." },
  { id: "astronomy", icon: "🔭", label: "Astronomy", description: "Explore celestial objects, missions, observations, and cosmology." },
  { id: "engineering", icon: "⚙️", label: "Engineering", description: "Prototype systems, constraints, materials, and tradeoffs." },
  { id: "simulation", icon: "🧮", label: "Simulations", description: "Define models, assumptions, scenarios, and measurable outcomes." },
  { id: "future", icon: "🧬", label: "Future Studies", description: "Investigate emerging technology and evidence-based possibilities." },
];

function loadExperiments() { return loadContentLabExperiments(); }

export default function ExperimentLab() {
  const [domain, setDomain] = useState("science");
  const [question, setQuestion] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [experiments, setExperiments] = useState(loadExperiments);
  const [selectedExperimentId, setSelectedExperimentId] = useState("");
  const [batchSizeGrams, setBatchSizeGrams] = useState(1000);
  const [activeExperimentTab, setActiveExperimentTab] = useState("result");
  const [dialogueMessages, setDialogueMessages] = useState([]);
  const [dialogueInput, setDialogueInput] = useState("");
  const [dialogueLoading, setDialogueLoading] = useState(false);
  const [dialogueError, setDialogueError] = useState("");
  const activeDomain = useMemo(() => DOMAINS.find((item) => item.id === domain), [domain]);
  const selectedExperiment = useMemo(() => experiments.find(({ id }) => id === selectedExperimentId) || experiments.find(({ formulationProposal }) => formulationProposal) || experiments.find((item) => /degreas|cleaner|cleaning product/i.test(item.question || item.title)) || null, [experiments, selectedExperimentId]);
  const formulation = useMemo(() => selectedExperiment?.formulationProposal || buildProductFormulationProposal({ objective: selectedExperiment?.question || selectedExperiment?.title || "", batchSizeGrams: 1000 }), [selectedExperiment]);
  const batchComponents = useMemo(() => calculateFormulationBatch(formulation?.components || [], batchSizeGrams), [formulation, batchSizeGrams]);

  useEffect(() => {
    try {
      const handoff = JSON.parse(localStorage.getItem(HANDOFF_KEY) || "null");
      if (!handoff || handoff.path !== "/content-lab") return;
      if (handoff.contentLabExperiment) {
        const saved = persistContentLabExperiment(handoff.contentLabExperiment);
        if (saved?.formulationProposal) setSelectedExperimentId(saved.id);
        setExperiments(loadExperiments());
      }
      setDomain(/formula|product|degreaser|prototype|material/i.test(handoff.prompt || "") ? "engineering" : "science");
      setQuestion(String(handoff.prompt || handoff.research?.query || ""));
      const evidence = handoff.research?.synthesis || handoff.reply || "";
      setHypothesis(String(evidence).slice(0, 3000));
      localStorage.removeItem(HANDOFF_KEY);
    } catch {
      localStorage.removeItem(HANDOFF_KEY);
    }
  }, []);

  useEffect(() => {
    if (!selectedExperiment?.id) { setDialogueMessages([]); return; }
    setDialogueMessages(loadContentLabDialogue(selectedExperiment.id));
    setDialogueInput("");
    setDialogueError("");
  }, [selectedExperiment?.id]);

  const createExperiment = () => {
    if (!question.trim()) return;
    const experiment = {
      id: globalThis.crypto?.randomUUID?.() || `experiment_${Date.now()}`,
      domain,
      title: question.trim().slice(0, 90),
      question: question.trim(),
      hypothesis: hypothesis.trim(),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    const next = [experiment, ...experiments];
    setExperiments(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setQuestion("");
    setHypothesis("");
  };

  const sendLabFollowUp = async () => {
    const content = dialogueInput.trim();
    if (!content || !selectedExperiment?.id || dialogueLoading) return;
    const userMessage = { id: globalThis.crypto?.randomUUID?.() || `lab_user_${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    const pending = saveContentLabDialogue(selectedExperiment.id, [...dialogueMessages, userMessage]);
    setDialogueMessages(pending);
    setDialogueInput("");
    setDialogueError("");
    setDialogueLoading(true);
    try {
      const data = await apiFetch("/api/chat/lab-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          experimentId: selectedExperiment.id,
          experiment: { ...selectedExperiment, formulationProposal: formulation },
          history: dialogueMessages.slice(-12).map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
      });
      const assistantMessage = { id: globalThis.crypto?.randomUUID?.() || `lab_assistant_${Date.now()}`, role: "assistant", content: data.reply || "AstraMind completed the follow-up without displayable text.", createdAt: new Date().toISOString(), provider: data.intelligence?.provider, fallback: Boolean(data.intelligence?.fallback) };
      setDialogueMessages(saveContentLabDialogue(selectedExperiment.id, [...pending, assistantMessage]));
    } catch (error) {
      setDialogueError(error.message || "The Content Lab response could not be generated.");
    } finally { setDialogueLoading(false); }
  };

  const clearLabDialogue = () => {
    if (!selectedExperiment?.id) return;
    setDialogueMessages(clearContentLabDialogue(selectedExperiment.id));
    setDialogueError("");
  };

  return (
    <div className="experiment-lab-page">
      <header className="experiment-lab-hero">
        <div>
          <p>Creator exploration workspace</p>
          <h1>🧪 Content Lab</h1>
          <span>Explore science, astronomy, engineering, simulations, and emerging ideas without mixing experiments into Creator Studio production projects.</span>
        </div>
        <div className="experiment-lab-count"><strong>{experiments.length}</strong><span>saved experiments</span></div>
      </header>

      <section className="experiment-domain-grid">
        {DOMAINS.map((item) => (
          <button key={item.id} type="button" className={domain === item.id ? "active" : ""} onClick={() => setDomain(item.id)}>
            <span>{item.icon}</span><strong>{item.label}</strong><small>{item.description}</small>
          </button>
        ))}
      </section>

      <div className="experiment-workspace-grid">
        <section className="experiment-card">
          <p className="experiment-kicker">New {activeDomain.label} experiment</p>
          <h2>Frame the exploration</h2>
          <label>Research question or idea<textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Example: How could a lunar radio telescope observe the early universe?" /></label>
          <label>Working hypothesis or expected outcome<textarea value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} placeholder="Optional: Describe what you expect and why." /></label>
          <button type="button" className="experiment-primary" onClick={createExperiment} disabled={!question.trim()}>Create experiment draft</button>
        </section>

        <section className="experiment-card">
          <p className="experiment-kicker">Experiment vault</p>
          <h2>Recent explorations</h2>
          {experiments.length === 0 ? <div className="experiment-empty">No experiments yet. Choose a domain and frame your first question.</div> : (
            <div className="experiment-list">{experiments.map((item) => (
              <article key={item.id} className={selectedExperiment?.id === item.id ? "selected" : ""}>
                <button type="button" onClick={() => setSelectedExperimentId(item.id)}>
                  <div><span>{DOMAINS.find((entry) => entry.id === item.domain)?.icon}</span><strong>{item.title}</strong></div>
                  <p>{item.hypothesis || "Hypothesis not defined yet."}</p>
                  <small>{new Date(item.createdAt).toLocaleString()} · {item.status}{item.formulationProposal || /degreas|cleaner|cleaning product/i.test(item.question || item.title) ? " · formulation ready" : ""}</small>
                </button>
              </article>
            ))}</div>
          )}
        </section>
      </div>

      {selectedExperiment ? (
        <nav className="experiment-continuation-tabs" aria-label="Selected experiment workspace">
          <button type="button" className={activeExperimentTab === "result" ? "active" : ""} onClick={() => setActiveExperimentTab("result")}>Experiment result</button>
          <button type="button" className={activeExperimentTab === "dialogue" ? "active" : ""} onClick={() => setActiveExperimentTab("dialogue")}>Response / follow-up{dialogueMessages.length ? ` (${dialogueMessages.length})` : ""}</button>
        </nav>
      ) : null}

      {formulation && activeExperimentTab === "result" ? (
        <section className="experiment-card formulation-workbench">
          <div className="formulation-heading">
            <div><p className="experiment-kicker">Governed formulation workspace</p><h2>{formulation.name}</h2></div>
            <label>Research batch size (grams)<input type="number" min="100" max="25000" step="100" value={batchSizeGrams} onChange={(event) => setBatchSizeGrams(event.target.value)} /></label>
          </div>
          <p className="formulation-intent">{formulation.designIntent}</p>
          <div className="formulation-warning"><strong>Research prototype—not production-ready.</strong> Exact supplier grades, active-matter corrections, mixture hazards, preservation, performance, and legal clearance remain gated.</div>
          <div className="formulation-table-wrap">
            <table className="formulation-table">
              <thead><tr><th>Candidate ingredient</th><th>Function</th><th>Design range</th><th>Target %</th><th>Batch grams</th></tr></thead>
              <tbody>{batchComponents.map((component) => (
                <tr key={component.id}><td><strong>{component.ingredient}</strong><small>{component.gate}</small></td><td>{component.role}</td><td>{component.range}</td><td>{component.percentage}%</td><td>{component.grams} g</td></tr>
              ))}</tbody>
              <tfoot><tr><th colSpan="3">Research batch total</th><th>{formulation.totalPercentage}%</th><th>{batchComponents.reduce((sum, component) => sum + component.grams, 0).toFixed(2)} g</th></tr></tfoot>
            </table>
          </div>
          <div className="formulation-gates">
            <div><h3>Controlled development sequence</h3><ol>{formulation.controlledSequence.map((item) => <li key={item}>{item}</li>)}</ol></div>
            <div><h3>Validation gates</h3><ul>{formulation.acceptanceGates.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>IP and originality screen</h3><p>{formulation.ipScreen.notice}</p><ul>{formulation.ipScreen.searches.map((item) => <li key={item}>{item}</li>)}</ul><strong>{formulation.ipScreen.requiredReview}</strong></div>
          </div>
        </section>
      ) : null}

      {selectedExperiment && !formulation && activeExperimentTab === "result" ? (
        <section className="experiment-card experiment-result-panel">
          <p className="experiment-kicker">Selected experiment</p>
          <h2>{selectedExperiment.title}</h2>
          <p>{selectedExperiment.question}</p>
          <pre>{selectedExperiment.hypothesis || "No generated result has been saved for this experiment yet."}</pre>
        </section>
      ) : null}

      {selectedExperiment && activeExperimentTab === "dialogue" ? (
        <section className="experiment-card lab-dialogue-panel">
          <div className="lab-dialogue-heading">
            <div><p className="experiment-kicker">Persistent experiment conversation</p><h2>Lab Dialogue</h2><span>Following: {selectedExperiment.title}</span></div>
            <button type="button" onClick={clearLabDialogue} disabled={!dialogueMessages.length || dialogueLoading}>Clear dialogue</button>
          </div>
          <div className="lab-dialogue-messages" aria-live="polite">
            {dialogueMessages.length ? dialogueMessages.map((message) => (
              <article key={message.id} className={`lab-message ${message.role}`}>
                <div><strong>{message.role === "assistant" ? "AstraMind Lab" : "You"}</strong><small>{new Date(message.createdAt).toLocaleString()}{message.provider ? ` · ${message.provider}` : ""}</small></div>
                <p>{message.content}</p>
              </article>
            )) : <div className="lab-dialogue-empty"><strong>Continue this experiment.</strong><span>Ask why an ingredient was selected, request a scaled batch, challenge an assumption, compare a design range, or identify the next validation gate.</span></div>}
            {dialogueLoading ? <article className="lab-message assistant thinking"><strong>AstraMind Lab is reasoning within the experiment context...</strong></article> : null}
          </div>
          {dialogueError ? <div className="lab-dialogue-error">{dialogueError}</div> : null}
          <div className="lab-dialogue-composer">
            <textarea value={dialogueInput} onChange={(event) => setDialogueInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendLabFollowUp(); } }} placeholder="Ask a follow-up about this experiment, its evidence, formulation, quantities, testing, or IP gates..." />
            <button type="button" onClick={sendLabFollowUp} disabled={!dialogueInput.trim() || dialogueLoading}>{dialogueLoading ? "Thinking..." : "Send follow-up"}</button>
          </div>
          <div className="lab-dialogue-footnote">Enter sends · Shift + Enter adds a new line · Saved to this experiment</div>
        </section>
      ) : null}
    </div>
  );
}
