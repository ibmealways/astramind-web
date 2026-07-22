import { calculateFormulationBatch } from "./ProductFormulationEngine.js";

const clean = (value, limit = 4000) => String(value || "").trim().slice(0, limit);
const round = (value, places = 2) => Number(Number(value || 0).toFixed(places));

function componentTable(formulation, batchSize) {
  const components = calculateFormulationBatch(formulation?.components || [], batchSize);
  if (!components.length) return "No governed component list is stored for this experiment.";
  return components.map((item) => `- ${item.ingredient}: ${item.percentage}% (${item.grams} g) — ${item.role}`).join("\n");
}

function requestedBatchSize(message, fallback) {
  const kilograms = message.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/i);
  if (kilograms) return Math.min(Math.max(Number(kilograms[1]) * 1000, 100), 25000);
  const grams = message.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)/i);
  if (grams) return Math.min(Math.max(Number(grams[1]), 100), 25000);
  return Number(fallback) || 1000;
}

function requestedVolume(message) {
  const valuePattern = "(\\d+(?:\\.\\d+)?)";
  const definitions = [
    { pattern: new RegExp(`${valuePattern}\\s*(?:us|u\\.s\\.)?\\s*(?:liquid\\s*)?(?:gal|gallon|gallons)\\b`, "i"), unit: "US liquid gallons", milliliters: 3785.411784 },
    { pattern: new RegExp(`${valuePattern}\\s*(?:l|liter|liters|litre|litres)\\b`, "i"), unit: "liters", milliliters: 1000 },
    { pattern: new RegExp(`${valuePattern}\\s*(?:ml|milliliter|milliliters|millilitre|millilitres)\\b`, "i"), unit: "milliliters", milliliters: 1 },
    { pattern: new RegExp(`${valuePattern}\\s*(?:us|u\\.s\\.)?\\s*(?:fl\\.?\\s*oz|fluid\\s*ounce|fluid\\s*ounces)\\b`, "i"), unit: "US fluid ounces", milliliters: 29.5735295625 },
  ];
  const imperial = /\b(?:imperial|uk|u\.k\.)\b/i.test(message);
  for (const definition of definitions) {
    const match = message.match(definition.pattern);
    if (!match) continue;
    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (imperial && definition.unit === "US liquid gallons") {
      return { amount, unit: "Imperial gallons", milliliters: round(amount * 4546.09, 3) };
    }
    if (imperial && definition.unit === "US fluid ounces") {
      return { amount, unit: "Imperial fluid ounces", milliliters: round(amount * 28.4130625, 3) };
    }
    return { amount, unit: definition.unit, milliliters: round(amount * definition.milliliters, 3) };
  }
  return null;
}

function measuredDensity(message, formulation) {
  const stored = Number(formulation?.measuredDensityGPerMl || formulation?.measurements?.densityGPerMl);
  if (Number.isFinite(stored) && stored > 0) return { value: stored, source: "stored experiment measurement" };
  const patterns = [
    /\bmeasured\s+density(?:\s+(?:is|was|of))?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:g\s*\/\s*m[lL]|g\s+per\s+m[lL]|kg\s*\/\s*[lL])\b/i,
    /\bdensity\s+(?:was\s+)?measured\s+(?:at|as)\s*(\d+(?:\.\d+)?)\s*(?:g\s*\/\s*m[lL]|g\s+per\s+m[lL]|kg\s*\/\s*[lL])\b/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return { value: Number(match[1]), source: "creator-reported measurement" };
  }
  return null;
}

function volumeScalingAnswer(message, formulation, volume) {
  const density = measuredDensity(message, formulation);
  const volumeLabel = `${volume.amount} ${volume.unit} (${volume.milliliters.toLocaleString("en-US", { maximumFractionDigits: 3 })} mL)`;
  if (!density) {
    return `### Measured density required before volume scaling\n\n**Requested finished volume:** ${volumeLabel}\n\nA volume cannot be converted into accurate ingredient masses without the **measured density of the finished, homogeneous baseline**. AstraMind has therefore issued no ingredient quantities and has not substituted water density.\n\nMeasure density at a recorded temperature with a calibrated method, then reply in this format:\n\n\`Measured density is 1.02 g/mL at 20 °C. Scale to ${volume.amount} ${volume.unit}.\`\n\nThe conversion will be: **target mass (g) = ${volume.milliliters} mL × measured density (g/mL)**. Supplier active matter and the formulation's other validation gates still require review.`;
  }
  if (density.value < 0.5 || density.value > 2) {
    return `### Density measurement needs verification\n\nThe supplied measured density of **${density.value} g/mL** is outside AstraMind's governed liquid-scaling range of 0.5-2.0 g/mL. No quantities were issued. Confirm the unit, instrument, temperature, and sample homogeneity before trying again.`;
  }
  const targetMass = round(volume.milliliters * density.value);
  if (targetMass < 100 || targetMass > 25000) {
    return `### Volume request exceeds the governed batch boundary\n\n**Requested volume:** ${volumeLabel}\n**Measured density:** ${density.value} g/mL (${density.source})\n**Calculated target mass:** ${targetMass.toLocaleString("en-US")} g\n\nThe governed local engine supports individual research batches from 100 g through 25,000 g. No quantities were issued. Split the work into qualified sub-batches or obtain process-scale review before proceeding.`;
  }
  return `### Governed volume-to-mass calculation\n\n**Requested finished volume:** ${volumeLabel}\n**Measured density:** ${density.value} g/mL (${density.source})\n**Target batch mass:** ${targetMass.toLocaleString("en-US")} g\n\n${componentTable(formulation, targetMass)}\n\n**Mass balance:** ${formulation.totalPercentage}% and ${targetMass.toLocaleString("en-US")} g target total. Quantities are calculated from the stored research percentages and the reported measured density. They are not manufacturing instructions or a commercially validated formula; verify supplier active matter and all acceptance gates before batching.`;
}

function ingredientAnswer(message, formulation) {
  const component = (formulation?.components || []).find((item) => {
    const terms = [item.id, item.ingredient, ...(clean(item.ingredient).toLowerCase().split(/\s+/).filter((term) => term.length > 4))];
    return terms.some((term) => clean(term).length > 3 && message.toLowerCase().includes(clean(term).toLowerCase()));
  });
  if (!component) return null;
  return `### Why ${component.ingredient} is in the baseline\n\n**Design assumption:** It is included at ${component.percentage}% as the ${component.role.toLowerCase()}. Its stored candidate range is ${component.range}. This is a formulation rationale, not proof that the ingredient or concentration is optimal.\n\n**Evidence boundary:** The saved experiment does not contain ingredient-specific evidence sufficient to claim that this exact supplier grade, concentration, or mixture is validated. The exact CAS, grade, active-matter concentration, impurities, and current supplier SDS must be verified.\n\n**Gate before increasing it:** ${component.gate}\n\nAny increase should be recorded as a new candidate version, with water adjusted so the total remains 100%. Compare the current baseline and revised candidate under identical blinded conditions; do not overwrite the control.`;
}

export function generateLocalContentLabDialogue({ message, experiment = {} } = {}) {
  const question = clean(message);
  const formulation = experiment.formulationProposal || null;
  const lower = question.toLowerCase();
  const volume = formulation ? requestedVolume(question) : null;
  const namedIngredient = formulation ? ingredientAnswer(question, formulation) : null;
  let response;

  if (volume) {
    response = volumeScalingAnswer(question, formulation, volume);
  } else if (namedIngredient) {
    response = namedIngredient;
  } else if (formulation && /(scale|batch|quantity|quantities|grams?|kilograms?|\bkg\b|how much)/i.test(question)) {
    const batchSize = requestedBatchSize(question, formulation.batchSizeGrams);
    response = `### Governed batch calculation: ${batchSize >= 1000 ? `${batchSize / 1000} kg` : `${batchSize} g`}\n\n${componentTable(formulation, batchSize)}\n\n**Mass balance:** ${formulation.totalPercentage}% and ${batchSize} g total. These are research quantities calculated from the stored percentages—not manufacturing instructions or a commercially validated formula. Verify supplier active matter before batching.`;
  } else if (formulation && /(test|gate|validate|validation|prove|performance|compatible|compatibility|stability|safe)/i.test(question)) {
    response = `### Validation path for ${formulation.name}\n\n${(formulation.acceptanceGates || []).map((gate, index) => `${index + 1}. ${gate}`).join("\n")}\n\nKeep the original baseline as the control, change one variable at a time, define pass/fail thresholds before testing, and have a qualified formulation chemist approve mixture hazard classification. Passing bench tests would support further development; it would not by itself prove commercial safety, regulatory compliance, or environmental claims.`;
  } else if (formulation && /(patent|infring|intellectual property|\bip\b|commercial|sell|market)/i.test(question)) {
    response = `### Intellectual-property and commercialization gate\n\n${formulation.ipScreen?.notice || "The experiment has not been cleared for commercial use."}\n\n${(formulation.ipScreen?.searches || []).map((item) => `- ${item}`).join("\n")}\n\n**Required review:** ${formulation.ipScreen?.requiredReview || "Obtain qualified legal and regulatory review before commercialization."}`;
  } else if (formulation && /(ingredient|formula|formulation|component|percent|concentration|what is in)/i.test(question)) {
    response = `### Stored candidate formulation\n\n${componentTable(formulation, formulation.batchSizeGrams)}\n\n**Status:** ${formulation.status}. This is an original research baseline for controlled comparison. It is not a verified commercial formula, a safety certification, or evidence of freedom to operate.`;
  } else {
    const evidence = clean(experiment.hypothesis || experiment.evidenceSummary, 1200);
    response = `### Content Lab continuation\n\nI can answer this from the saved experiment, but the local fallback will not invent evidence.\n\n**Stored experiment:** ${clean(experiment.title || experiment.question, 500) || "Untitled experiment"}\n${evidence ? `\n**Stored evidence or hypothesis:** ${evidence}` : "\n**Evidence status:** No focused evidence summary is stored for this question."}\n\n**Best next action:** Ask about a named ingredient, batch scaling, test gates, surface compatibility, safety review, wastewater, biodegradability, or IP. If your question requires current external facts or a new comparison, run a new governed research mission and attach the resulting citations to this experiment.`;
  }

  return {
    text: `${response}\n\n---\n*Answered by AstraMind's governed local Content Lab engine because cloud intelligence providers were unavailable. Guidance is not a guarantee; external evidence and professional review remain required where identified.*`,
    provider: "astramind-local",
    model: "content-lab-governed-v1",
    responseId: null,
    gateway: "astramind-intelligence-local-fallback",
    fallback: true,
  };
}

export default generateLocalContentLabDialogue;
