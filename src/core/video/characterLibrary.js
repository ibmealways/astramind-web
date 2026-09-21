import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve("assets", "hollow-bloom");
const PROJECT_FILE = path.join(PROJECT_ROOT, "project.json");

function readProject() {
  return JSON.parse(fs.readFileSync(PROJECT_FILE, "utf8"));
}

function referencePathFor(character) {
  if (!character?.referenceImage) return null;
  const resolved = path.resolve(PROJECT_ROOT, character.referenceImage);
  if (!resolved.startsWith(`${PROJECT_ROOT}${path.sep}`)) throw new Error("Character reference escapes the project library.");
  return fs.existsSync(resolved) ? resolved : null;
}

export function listCharacterReferences() {
  const project = readProject();
  return (project.characters || []).map((character) => ({
    id: `${project.projectId}:${character.id}`,
    name: character.name,
    role: character.role,
    power: character.power,
    approval: character.approval,
    available: Boolean(referencePathFor(character)),
  }));
}

export function resolveCharacterReference(referenceId) {
  const project = readProject();
  const [projectId, characterId, ...extra] = String(referenceId || "").split(":");
  if (extra.length || projectId !== project.projectId) throw new Error("Unknown character reference.");
  const character = (project.characters || []).find((item) => item.id === characterId);
  if (!character) throw new Error("Unknown character reference.");
  const imagePath = referencePathFor(character);
  if (!imagePath) throw new Error(`${character.name} does not have a reference image yet.`);
  return { character, imagePath };
}
