const round = (value, places = 2) => Number(Number(value || 0).toFixed(places));

const DEGREASER_BASELINE = [
  { id: "water", ingredient: "Deionized water", role: "Carrier", percentage: 92, range: "88-95%", gate: "Use verified process water; final water is adjusted only after all other components are weighed." },
  { id: "primary-surfactant", ingredient: "Alkyl polyglucoside surfactant (supplier grade)", role: "Primary grease wetting and lift", percentage: 4, range: "3-6%", gate: "Confirm supplier active-matter percentage, current SDS, and EPA Safer Choice/SCIL status for the exact CAS and grade." },
  { id: "low-foam-surfactant", ingredient: "Low-foam nonionic surfactant (SCIL-screened supplier grade)", role: "Grease removal and foam control", percentage: 1.5, range: "0.5-3%", gate: "Select the exact chemistry with a qualified formulator; screen aquatic toxicity, biodegradation, impurities, and food-service use conditions." },
  { id: "citrate", ingredient: "Sodium citrate", role: "Water conditioning and builder", percentage: 1.5, range: "0.5-3%", gate: "Verify grade, solubility, supplier SDS, residue, and wastewater compatibility." },
  { id: "gluconate", ingredient: "Sodium gluconate", role: "Chelation and metal-ion control", percentage: 1, range: "0.25-2%", gate: "Verify the exact grade against current safer-ingredient criteria and surface-compatibility results." },
];

export function calculateFormulationBatch(components = [], batchSizeGrams = 1000) {
  const batch = round(Math.min(Math.max(Number(batchSizeGrams) || 1000, 100), 25000));
  const calculated = components.map((component) => ({
    ...component,
    grams: round(batch * Number(component.percentage || 0) / 100),
  }));
  const calculatedTotal = round(calculated.reduce((sum, component) => sum + component.grams, 0));
  const adjustment = round(batch - calculatedTotal);
  if (calculated.length && adjustment) {
    const carrierIndex = calculated.findIndex(({ id, role }) => id === "water" || /carrier/i.test(role || ""));
    const index = carrierIndex >= 0 ? carrierIndex : 0;
    calculated[index] = { ...calculated[index], grams: round(calculated[index].grams + adjustment) };
  }
  return calculated;
}

export function buildProductFormulationProposal({ objective = "", batchSizeGrams = 1000 } = {}) {
  if (!/degreas|cleaner|cleaning product/i.test(objective)) return null;
  const components = calculateFormulationBatch(DEGREASER_BASELINE, batchSizeGrams);
  const totalPercentage = round(components.reduce((sum, component) => sum + component.percentage, 0));
  const totalGrams = round(components.reduce((sum, component) => sum + component.grams, 0));
  return {
    version: "governed-formulation-v1",
    status: "conceptual-research-prototype",
    name: "AstraMind Neutral Aqueous Degreaser Baseline A",
    objective,
    batchSizeGrams: totalGrams,
    totalPercentage,
    components,
    designIntent: "A fragrance-free, dye-free, phosphate-free starting control intended for comparative bench testing—not a finished industrial product.",
    boundaries: [
      "This is an original research starting point, not a verified commercial formula, Safer Choice certification, or guarantee of performance or safety.",
      "Do not sell, distribute, store long-term, or use in a restaurant until a qualified formulation chemist completes mixture hazard classification, stability, preservation, residue, food-contact, packaging, and regulatory review.",
      "This prototype is a cleaner/degreaser only. Do not make sanitizer, disinfectant, antimicrobial, or food-contact claims without the separate testing and regulatory pathway those claims require.",
      "Do not add sodium hydroxide, potassium hydroxide, bleach, ammonia, strong acids, oxidizers, fragrances, dyes, or solvents during an unsupervised iteration.",
      "Supplier concentration varies. Recalculate on an active-matter basis before making a laboratory batch.",
    ],
    controlledSequence: [
      "Approve complete supplier SDS and certificates for every exact grade before batching.",
      "Reserve a portion of the water; dissolve citrate and gluconate in the main water charge.",
      "Add surfactants slowly with low agitation to limit aeration, then restore reserved water to target mass.",
      "Record appearance, pH, density, viscosity, foam, and mass balance; quarantine the sample for controlled testing.",
    ],
    acceptanceGates: [
      "Measured pH and hazard classification approved by a qualified chemist; no target pH is assumed from the ingredient list.",
      "Blinded grease-removal benchmark against commercial controls at equal dilution, temperature, dwell time, and mechanical action.",
      "Coupon testing on stainless steel, aluminum, painted/coated surfaces, plastics, seals, grout, and flooring.",
      "Residue/rinse, slip, foam, storage stability, freeze-thaw, microbial challenge, packaging, and wastewater review.",
      "Independent biodegradation and aquatic-impact evidence supports any environmental marketing claim.",
    ],
    ipScreen: {
      status: "not-cleared",
      notice: "Different ingredients or percentages do not by themselves establish freedom to operate. Patent infringement analysis compares active patent claims with the proposed composition and process.",
      searches: [
        "USPTO Patent Public Search: aqueous industrial degreaser alkyl polyglucoside citrate gluconate",
        "USPTO/CPC search: cleaning compositions for grease removal and low-foam hard-surface cleaners",
        "Search composition claims, concentration ranges, manufacturing sequence, application method, and intended restaurant-kitchen use.",
      ],
      requiredReview: "Have a registered patent attorney or agent perform a jurisdiction-specific freedom-to-operate review before commercialization.",
    },
  };
}

export default buildProductFormulationProposal;
