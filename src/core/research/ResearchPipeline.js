const OFFICIAL_DOMAINS = ["epa.gov", "osha.gov", "cdc.gov", "nih.gov", "nist.gov", "fda.gov", "regulations.gov", "europa.eu", "echa.europa.eu", "oecd.org", "un.org"];
const STANDARD_DOMAINS = ["iso.org", "astm.org", "ul.com", "nsf.org"];
const COMMUNITY_DOMAINS = ["reddit.com", "quora.com", "facebook.com", "practicalmachinist.com", "medium.com", "answers.com"];
const STOP_WORDS = new Set(["about", "after", "also", "and", "are", "for", "from", "into", "other", "that", "the", "their", "this", "used", "using", "with", "without", "research", "produce"]);

function clean(value, limit = 1200) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function hostnameOf(url) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

function canonicalUrlKey(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    const parameters = [...parsed.searchParams.entries()]
      .filter(([key]) => !/^utm_|^(fbclid|gclid)$/i.test(key))
      .sort(([left], [right]) => left.localeCompare(right));
    const search = new URLSearchParams(parameters).toString();
    return `${hostname}${pathname}${search ? `?${search}` : ""}`.toLowerCase();
  } catch { return clean(url, 2000).toLowerCase(); }
}

function domainMatches(hostname, domains) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function publisherFromHost(hostname) {
  const known = {
    "epa.gov": "U.S. Environmental Protection Agency",
    "osha.gov": "U.S. Occupational Safety and Health Administration",
    "regulations.gov": "U.S. Regulations.gov",
    "cdc.gov": "U.S. Centers for Disease Control and Prevention",
    "oecd.org": "OECD",
    "echa.europa.eu": "European Chemicals Agency",
    "iso.org": "International Organization for Standardization",
    "astm.org": "ASTM International",
  };
  const match = Object.entries(known).find(([domain]) => hostname === domain || hostname.endsWith(`.${domain}`));
  if (match) return match[1];
  if (!hostname) return "Unknown publisher";
  return hostname.split(".").slice(-2).join(".");
}

function tokens(value) {
  const text = clean(value, 10000).toLowerCase();
  const base = text.match(/[a-z0-9]{3,}/g) || [];
  if (/\bsds\b/.test(text)) base.push("safety", "data", "sheet");
  if (/\bghs\b/.test(text)) base.push("hazard", "communication", "classification");
  if (/biodegrad/.test(text)) base.push("environmental", "fate", "biodegradable");
  if (/wastewater/.test(text)) base.push("discharge", "effluent", "sewer");
  if (/degreaser|cleaning chemical|formulat/.test(text)) base.push("chemical", "safer", "criteria", "safety");
  return [...new Set(base)].filter((token) => !STOP_WORDS.has(token));
}

function sourceType(source) {
  if (domainMatches(source.hostname, OFFICIAL_DOMAINS)) return "government";
  if (domainMatches(source.hostname, STANDARD_DOMAINS)) return "standards-body";
  if (domainMatches(source.hostname, COMMUNITY_DOMAINS) || /\b(forum|comment thread|discussion)\b/i.test(`${source.title} ${source.summary}`)) return "community";
  if (source.hostname.endsWith(".edu") || /\b(journal|university|research institute)\b/i.test(source.publisher)) return "academic";
  const documentTerms = /\b(safety data sheet|sds|technical data sheet|product data sheet)\b/i;
  const isPdf = /\.pdf(?:$|[?#])/i.test(source.url || "");
  // A page that merely discusses SDS requirements is not itself an SDS.
  if (documentTerms.test(source.title) || (isPdf && documentTerms.test(source.summary))) return "manufacturer-document";
  if (/\b(news|journal|times|post|reuters|associated press)\b/i.test(source.publisher)) return "news";
  return "commercial";
}

function authorityScore(type) {
  return ({ government: 0.98, "standards-body": 0.94, academic: 0.84, "manufacturer-document": 0.72, news: 0.56, commercial: 0.38, community: 0.12 })[type] || 0.25;
}

function recencyScore(publishedAt, type) {
  const time = Date.parse(publishedAt || "");
  if (!Number.isFinite(time)) return ["government", "standards-body"].includes(type) ? 0.72 : type === "manufacturer-document" ? 0.6 : 0.42;
  const years = Math.max(0, (Date.now() - time) / 31557600000);
  if (years <= 2) return 0.95;
  if (years <= 5) return 0.78;
  if (years <= 10) return 0.58;
  return 0.32;
}

function classifyLane(source) {
  const text = `${source.title} ${source.summary}`.toLowerCase();
  if (/osha|ghs|hazard communication|safety data sheet|\bsds\b/.test(text)) return "Worker safety and SDS/GHS";
  if (/biodegrad|safer choice|environmental fate|aquatic|oecd/.test(text)) return "Biodegradability and environmental profile";
  if (/wastewater|sewer|discharge|effluent/.test(text)) return "Wastewater and disposal";
  if (/corrosion|compatib|surface|aluminum|steel|plastic/.test(text)) return "Surface compatibility";
  if (/performance|soil removal|cleaning|degreas|contact time/.test(text)) return "Performance and competitor evidence";
  return "Supporting evidence";
}

function safetySensitive(query) {
  return /chemical|degreaser|cleaner|ingredient|tox|hazard|safety|sds|ghs|osha|epa|wastewater|biodegrad|formulat/i.test(query || "");
}

export function buildEvidenceResearchQueries(query = "", { maxQueries = 6 } = {}) {
  const base = clean(query, 900);
  if (!base) return [];
  const chemical = safetySensitive(base);
  // Tavily rejects oversized queries. Preserve the mission as the governance
  // context, but keep each provider query focused and safely below its limit.
  const searchBase = clean(base, 240);
  const lanes = chemical ? [
    { lane: "Safer ingredients and environmental profile", query: `${searchBase} site:epa.gov Safer Choice criteria safer chemical ingredients` },
    { lane: "Worker safety and SDS/GHS", query: `${searchBase} site:osha.gov hazard communication safety data sheet GHS` },
    { lane: "Biodegradability standards", query: `${searchBase} site:oecd.org biodegradability test guideline detergents surfactants` },
    { lane: "Competitor technical documents", query: `${searchBase} Purple Power industrial degreaser official SDS technical data sheet` },
    { lane: "Performance and compatibility", query: `${searchBase} industrial degreaser performance test surface compatibility corrosion standard` },
    { lane: "Wastewater and disposal", query: `${searchBase} wastewater discharge restaurant cleaning chemicals official guidance` },
  ] : [
    { lane: "Primary evidence", query: searchBase },
    { lane: "Official guidance", query: `${searchBase} official guidance` },
    { lane: "Independent research", query: `${searchBase} university research evidence` },
  ];
  return lanes.slice(0, Math.min(Math.max(Number(maxQueries) || 6, 1), 8));
}

function normalizeSource(source, index) {
  const title = clean(source?.title, 300);
  const url = clean(source?.url, 2000);
  if (!title) return null;
  const hostname = hostnameOf(url);
  // A search provider transports evidence; it is not the evidence publisher.
  // Prefer supplied publication metadata, then derive a readable publisher
  // from the source URL (for example, epa.gov -> U.S. EPA).
  const publisher = clean(source?.source || source?.publisher || source?.sourceName, 120) || publisherFromHost(hostname);
  const normalized = {
    id: source.id || `source-${index + 1}`,
    title,
    url: /^https?:\/\//i.test(url) ? url : null,
    hostname,
    publisher,
    summary: clean(source?.description || source?.summary || source?.snippet || source?.content, 1400),
    publishedAt: source?.publishedAt || source?.publishedDate || null,
    evidenceLane: clean(source?.evidenceLane || source?.lane, 120) || null,
    provider: clean(source?.provider, 80) || null,
  };
  normalized.sourceType = sourceType(normalized);
  normalized.evidenceLane ||= classifyLane(normalized);
  return normalized;
}

export function planResearch(query, prior = {}) {
  const normalizedQuery = clean(query, 4000);
  return {
    ...prior,
    research: {
      query: normalizedQuery,
      status: "planned",
      method: "evidence-governance-v2",
      governance: { version: "2.0", safetySensitive: safetySensitive(normalizedQuery), policy: "authority-relevance-corroboration" },
      lanes: buildEvidenceResearchQueries(normalizedQuery),
      sources: [],
    },
  };
}

export function attachResearchSources(state, sources = [], collection = {}) {
  const seen = new Set();
  const normalized = sources.map(normalizeSource).filter(Boolean).filter((source) => {
    const key = source.url ? canonicalUrlKey(source.url) : source.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
  return { ...state, research: { ...state.research, status: "collected", sources: normalized, collection: { ...collection, sourceCount: normalized.length } } };
}

export function validateResearchSources(state) {
  const queryTokens = tokens(state.research?.query);
  const corpus = (state.research?.sources || []).map((source) => tokens(`${source.title} ${source.summary}`));
  const isSensitive = Boolean(state.research?.governance?.safetySensitive ?? safetySensitive(state.research?.query));
  const sources = (state.research?.sources || []).map((source, index) => {
    const documentTokens = new Set(corpus[index]);
    const relevance = queryTokens.length ? queryTokens.filter((token) => documentTokens.has(token)).length / queryTokens.length : 0.5;
    const otherTokens = new Set(corpus.filter((_, otherIndex) => otherIndex !== index).flat());
    const titleTokens = tokens(source.title);
    const corroboration = titleTokens.length ? titleTokens.filter((token) => otherTokens.has(token)).length / titleTokens.length : 0;
    const completeness = [source.title, source.url, source.publisher !== "Unknown publisher", source.summary, source.publishedAt].filter(Boolean).length / 5;
    const authority = authorityScore(source.sourceType);
    const recency = recencyScore(source.publishedAt, source.sourceType);
    const score = Number((authority * 0.35 + Math.min(relevance * 2, 1) * 0.3 + completeness * 0.15 + recency * 0.1 + corroboration * 0.1).toFixed(3));
    const rejectionReasons = [];
    if (!source.url) rejectionReasons.push("missing-url");
    if (relevance < 0.08) rejectionReasons.push("low-relevance");
    if (source.sourceType === "community") rejectionReasons.push("community-source-not-accepted-for-governed-claims");
    if (isSensitive && ["commercial", "news"].includes(source.sourceType)) rejectionReasons.push("insufficient-authority-for-safety-or-regulatory-claim");
    if (score < (isSensitive ? 0.47 : 0.4)) rejectionReasons.push("evidence-score-below-threshold");
    const valid = Boolean(source.title && source.url && rejectionReasons.length === 0);
    return {
      ...source,
      validation: {
        valid,
        status: valid ? "accepted" : "rejected",
        evidenceScore: score,
        dimensions: { authority, relevance: Number(relevance.toFixed(3)), completeness, recency, corroboration: Number(corroboration.toFixed(3)) },
        rejectionReasons,
      },
    };
  });
  const acceptedSources = sources.filter(({ validation }) => validation.valid);
  const rejectedSources = sources.filter(({ validation }) => !validation.valid);
  return {
    ...state,
    research: {
      ...state.research,
      status: "validated",
      sources,
      acceptedSources,
      rejectedSources,
      validSourceCount: acceptedSources.length,
      rejectedSourceCount: rejectedSources.length,
      governance: { ...state.research.governance, evaluatedSourceCount: sources.length, acceptedSourceCount: acceptedSources.length, rejectedSourceCount: rejectedSources.length },
    },
  };
}

function evidenceStrength(sources) {
  if (!sources.length) return { level: "insufficient", averageScore: 0, rationale: "No governed sources passed validation." };
  const averageScore = sources.reduce((sum, source) => sum + source.validation.evidenceScore, 0) / sources.length;
  const highAuthority = sources.filter((source) => ["government", "standards-body", "academic"].includes(source.sourceType)).length;
  const level = averageScore >= 0.72 && highAuthority >= 2 ? "strong" : averageScore >= 0.56 && sources.length >= 3 ? "moderate" : "limited";
  return { level, averageScore: Number(averageScore.toFixed(3)), highAuthoritySources: highAuthority, rationale: `${sources.length} governed source(s) accepted; ${highAuthority} high-authority source(s).` };
}

export function synthesizeResearch(state) {
  const accepted = state.research?.acceptedSources || (state.research?.sources || []).filter(({ validation }) => validation?.valid);
  const rejected = state.research?.rejectedSources || (state.research?.sources || []).filter(({ validation }) => !validation?.valid);
  const strength = evidenceStrength(accepted);
  const citations = accepted.map((source, index) => ({ index: index + 1, title: source.title, url: source.url, publisher: source.publisher, sourceType: source.sourceType, evidenceScore: source.validation.evidenceScore }));
  const grouped = new Map();
  accepted.forEach((source, index) => {
    const lane = source.evidenceLane || "Supporting evidence";
    if (!grouped.has(lane)) grouped.set(lane, []);
    grouped.get(lane).push({ claim: clean(source.summary || source.title, 420), citation: index + 1, evidenceScore: source.validation.evidenceScore });
  });
  const findings = [...grouped.entries()].map(([section, claims]) => ({ section, claims }));
  const chemical = Boolean(state.research?.governance?.safetySensitive);
  const disagreements = accepted.some((source) => source.sourceType === "manufacturer-document")
    ? ["Manufacturer performance or safety statements should be separated from independent or regulatory evidence and confirmed through controlled testing."]
    : ["No explicit disagreement was machine-detectable from the available excerpts; absence of disagreement is not proof of consensus."];
  const unansweredQuestions = chemical ? [
    "Which target soils, surfaces, dilution ranges, contact times, temperatures, and mechanical actions define success?",
    "Which complete supplier SDS and toxicology/environmental-fate datasets are available for every candidate ingredient class?",
    "What local wastewater authority limits and food-service sanitation requirements apply at the intended place of use?",
    "Which independent laboratory methods will establish cleaning performance, corrosion, residue, stability, and packaging compatibility?",
  ] : ["Which claims still depend on primary evidence?", "Which assumptions require controlled testing or expert review?"];
  const recommendedExperiments = chemical ? [
    "Have a qualified formulation chemist define candidate ingredient classes and exclusion criteria; do not infer a formula from search excerpts.",
    "Pre-register a blinded benchmark protocol using standardized soil loads and equal dilution, contact time, temperature, and mechanical action.",
    "Run coupon compatibility testing on stainless steel, aluminum, coated surfaces, plastics, seals, and flooring before any field use.",
    "Obtain laboratory biodegradation, aquatic-impact, stability, worker-exposure, residue, and wastewater compatibility evidence before performance or environmental claims.",
    "Complete SDS/GHS classification and regulatory review with qualified professionals before pilot manufacturing or distribution.",
  ] : ["Confirm high-impact claims with primary sources.", "Define measurable acceptance criteria before testing."];
  const executiveSummary = accepted.length
    ? `Evidence Governance v2 accepted ${accepted.length} of ${(state.research?.sources || []).length} collected sources. Overall evidence strength is ${strength.level}. Findings below are traceable to accepted citations; rejected sources are retained only in the audit trail.`
    : `Evidence Governance v2 found no sources strong enough for governed claims about ${state.research?.query || "this objective"}. Refine the research lanes or configure stronger primary-source coverage.`;
  const findingText = findings.map(({ section, claims }) => `\n${section}:\n${claims.map(({ claim, citation }) => `- ${claim} [${citation}]`).join("\n")}`).join("\n");
  const citationText = citations.map((citation) => `[${citation.index}] ${citation.publisher}: ${citation.title} — ${citation.url}`).join("\n");
  const synthesis = [
    `Evidence-governed research brief: ${state.research?.query || "Untitled objective"}`,
    "",
    "Executive summary",
    executiveSummary,
    findingText || "\nNo governed findings available.",
    "\nEvidence strength",
    `${strength.level.toUpperCase()} — ${strength.rationale}`,
    "\nDisagreements and cautions",
    disagreements.map((item) => `- ${item}`).join("\n"),
    "\nUnanswered questions",
    unansweredQuestions.map((item) => `- ${item}`).join("\n"),
    "\nRecommended next experiments",
    recommendedExperiments.map((item) => `- ${item}`).join("\n"),
    "\nAccepted citations",
    citationText || "None.",
    `\nAudit: ${rejected.length} source(s) rejected and excluded from governed claims.`,
  ].join("\n");
  return {
    ...state,
    research: {
      ...state.research,
      status: "synthesized",
      synthesis,
      citations,
      report: { version: "evidence-governance-v2", executiveSummary, evidenceStrength: strength, findings, disagreements, unansweredQuestions, recommendedExperiments, acceptedCitations: citations, rejectedSourceAudit: rejected.map(({ title, url, publisher, sourceType, validation }) => ({ title, url, publisher, sourceType, reasons: validation.rejectionReasons, evidenceScore: validation.evidenceScore })) },
    },
  };
}
