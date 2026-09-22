import fs from "fs";
import path from "path";

const testDb = path.resolve(".tmp-creator-library.db");
process.env.AIGENIKZ_PLATFORM_DB_PATH = testDb;

const { initPlatformCoreTables } = await import("../src/server/db/initPlatformCore.js");
const service = await import("../src/services/creatorAssetLibraryService.js");

try {
  await initPlatformCoreTables();
  const project = await service.createCreatorProject({ userId: "creator-a", title: "Hollow Bloom" });
  const episode = await service.createEpisode({ userId: "creator-a", projectId: project.id, title: "Seeds of Change" });
  const scene = await service.createScene({ userId: "creator-a", projectId: project.id, episodeId: episode.id, title: "The Last Day", durationSeconds: 9 });
  await service.updateCreatorProject({ userId: "creator-a", projectId: project.id, summary: "Permanent series memory" });
  await service.updateEpisode({ userId: "creator-a", projectId: project.id, episodeId: episode.id, synopsis: "Graduation changes everything." });
  await service.updateScene({ userId: "creator-a", projectId: project.id, sceneId: scene.id, script: "The friends leave graduation together.", visualPrompt: "Cinematic anime graduation courtyard" });
  const character = await service.registerAsset({ userId: "creator-a", projectId: project.id, sceneId: scene.id, assetType: "character", name: "Kyle", storageUri: "asset://kyle/v1" });
  const revision = await service.registerAsset({ userId: "creator-a", projectId: project.id, assetType: "character", name: "Kyle", storageUri: "asset://kyle/v2", parentAssetId: character.id });
  const library = await service.getProjectLibrary({ userId: "creator-a", projectId: project.id });
  const savedProject = (await service.listCreatorProjects("creator-a"))[0];
  if (savedProject.summary !== "Permanent series memory" || library.episodes[0].synopsis !== "Graduation changes everything." || library.scenes[0].script !== "The friends leave graduation together.") throw new Error("Autosave update paths failed.");
  if (library.counts.episodes !== 1 || library.counts.scenes !== 1 || library.counts.assets !== 2 || revision.version !== 2) throw new Error("Creator library counts or versioning are incorrect.");
  let isolated = false;
  try { await service.getProjectLibrary({ userId: "creator-b", projectId: project.id }); } catch { isolated = true; }
  if (!isolated) throw new Error("Project ownership isolation failed.");
  console.log(JSON.stringify({ ok: true, counts: library.counts, versioning: revision.version, autosaveUpdates: true, ownershipIsolation: isolated }));
} finally {
  for (const suffix of ["", "-wal", "-shm"]) {
    try { fs.rmSync(`${testDb}${suffix}`); } catch {}
  }
}
