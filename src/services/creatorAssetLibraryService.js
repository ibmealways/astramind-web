import crypto from "crypto";
import { getPlatformDb } from "../server/db/platformDb.js";

const ASSET_TYPES = new Set(["character", "location", "prop", "voice", "image", "video", "music", "sound-effect", "script", "subtitle", "export", "style-reference"]);
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
const json = (value) => JSON.stringify(value || {});
const parse = (value) => { try { return JSON.parse(value || "{}"); } catch { return {}; } };

function ownedProject(db, projectId, userId) {
  return db.prepare("SELECT id FROM platform_projects WHERE id = ? AND user_id = ?").get(projectId, userId);
}

export async function createCreatorProject({ userId, title, type = "video-series", summary = "", metadata = {} }) {
  const db = await getPlatformDb();
  const projectId = id("project");
  const timestamp = now();
  db.prepare(`INSERT INTO platform_projects (id,user_id,type,title,summary,topic,tone,audience,intensity,metadata_json,book_json,created_at,updated_at) VALUES (?,?,?,?,?,'','','','medium',?,'{}',?,?)`)
    .run(projectId, userId, type, String(title || "Untitled Project").trim(), String(summary || "").trim(), json(metadata), timestamp, timestamp);
  return { id: projectId, userId, type, title: String(title || "Untitled Project").trim(), summary, metadata, createdAt: timestamp, updatedAt: timestamp };
}

export async function listCreatorProjects(userId) {
  const db = await getPlatformDb();
  return db.prepare("SELECT * FROM platform_projects WHERE user_id = ? ORDER BY updated_at DESC").all(userId).map((row) => ({ id: row.id, type: row.type, title: row.title, summary: row.summary, metadata: parse(row.metadata_json), createdAt: row.created_at, updatedAt: row.updated_at }));
}


export async function updateCreatorProject({ userId, projectId, title, summary, type, metadata }) {
  const db = await getPlatformDb();
  if (!ownedProject(db, projectId, userId)) throw new Error("Project not found.");
  const current = db.prepare("SELECT * FROM platform_projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  const timestamp = now();
  db.prepare("UPDATE platform_projects SET title = ?, summary = ?, type = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(String(title ?? current.title).trim() || "Untitled Project", String(summary ?? current.summary), String(type ?? current.type), json(metadata ?? parse(current.metadata_json)), timestamp, projectId, userId);
  return { id: projectId, userId, title: String(title ?? current.title).trim() || "Untitled Project", summary: String(summary ?? current.summary), type: String(type ?? current.type), metadata: metadata ?? parse(current.metadata_json), updatedAt: timestamp };
}
export async function createEpisode({ userId, projectId, title, episodeNumber = 1, synopsis = "", metadata = {} }) {
  const db = await getPlatformDb();
  if (!ownedProject(db, projectId, userId)) throw new Error("Project not found.");
  const episodeId = id("episode"); const timestamp = now();
  db.prepare("INSERT INTO creator_episodes (id,user_id,project_id,title,episode_number,synopsis,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(episodeId, userId, projectId, String(title || `Episode ${episodeNumber}`).trim(), Number(episodeNumber), String(synopsis || ""), json(metadata), timestamp, timestamp);
  return { id: episodeId, projectId, title, episodeNumber: Number(episodeNumber), synopsis, metadata, status: "draft" };
}


export async function updateEpisode({ userId, projectId, episodeId, title, episodeNumber, synopsis, status, metadata }) {
  const db = await getPlatformDb();
  const current = db.prepare("SELECT * FROM creator_episodes WHERE id = ? AND project_id = ? AND user_id = ?").get(episodeId, projectId, userId);
  if (!current) throw new Error("Episode not found.");
  const timestamp = now();
  db.prepare("UPDATE creator_episodes SET title = ?, episode_number = ?, synopsis = ?, status = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(String(title ?? current.title).trim() || `Episode ${episodeNumber ?? current.episode_number}`, Number(episodeNumber ?? current.episode_number), String(synopsis ?? current.synopsis), String(status ?? current.status), json(metadata ?? parse(current.metadata_json)), timestamp, episodeId, userId);
  return { id: episodeId, projectId, title: title ?? current.title, episodeNumber: Number(episodeNumber ?? current.episode_number), synopsis: synopsis ?? current.synopsis, status: status ?? current.status, updatedAt: timestamp };
}
export async function createScene({ userId, projectId, episodeId = null, title, sceneNumber = 1, durationSeconds = 5, script = "", visualPrompt = "", productionMethod = "", metadata = {} }) {
  const db = await getPlatformDb();
  if (!ownedProject(db, projectId, userId)) throw new Error("Project not found.");
  if (episodeId && !db.prepare("SELECT id FROM creator_episodes WHERE id = ? AND project_id = ? AND user_id = ?").get(episodeId, projectId, userId)) throw new Error("Episode not found.");
  const sceneId = id("scene"); const timestamp = now();
  db.prepare("INSERT INTO creator_scenes (id,user_id,project_id,episode_id,scene_number,title,duration_seconds,script,visual_prompt,production_method,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(sceneId, userId, projectId, episodeId, Number(sceneNumber), String(title || `Scene ${sceneNumber}`).trim(), Math.max(1, Number(durationSeconds)), String(script || ""), String(visualPrompt || ""), String(productionMethod || ""), json(metadata), timestamp, timestamp);
  return { id: sceneId, projectId, episodeId, sceneNumber: Number(sceneNumber), title, durationSeconds: Math.max(1, Number(durationSeconds)), status: "draft" };
}


export async function updateScene({ userId, projectId, sceneId, episodeId, title, sceneNumber, durationSeconds, script, visualPrompt, productionMethod, status, metadata }) {
  const db = await getPlatformDb();
  const current = db.prepare("SELECT * FROM creator_scenes WHERE id = ? AND project_id = ? AND user_id = ?").get(sceneId, projectId, userId);
  if (!current) throw new Error("Scene not found.");
  const timestamp = now();
  db.prepare("UPDATE creator_scenes SET episode_id = ?, title = ?, scene_number = ?, duration_seconds = ?, script = ?, visual_prompt = ?, production_method = ?, status = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND user_id = ?")
    .run(episodeId === undefined ? current.episode_id : (episodeId || null), String(title ?? current.title).trim() || `Scene ${sceneNumber ?? current.scene_number}`, Number(sceneNumber ?? current.scene_number), Math.max(1, Number(durationSeconds ?? current.duration_seconds)), String(script ?? current.script), String(visualPrompt ?? current.visual_prompt), String(productionMethod ?? current.production_method), String(status ?? current.status), json(metadata ?? parse(current.metadata_json)), timestamp, sceneId, userId);
  return { id: sceneId, projectId, episodeId: episodeId === undefined ? current.episode_id : episodeId, title: title ?? current.title, sceneNumber: Number(sceneNumber ?? current.scene_number), durationSeconds: Math.max(1, Number(durationSeconds ?? current.duration_seconds)), status: status ?? current.status, updatedAt: timestamp };
}
export async function registerAsset({ userId, projectId = null, sceneId = null, assetType, name, source = "user", mimeType = "", storageUri = "", localPath = "", parentAssetId = null, reusable = true, metadata = {} }) {
  const db = await getPlatformDb();
  if (!ASSET_TYPES.has(assetType)) throw new Error(`Unsupported asset type: ${assetType}.`);
  if (projectId && !ownedProject(db, projectId, userId)) throw new Error("Project not found.");
  if (sceneId && !db.prepare("SELECT id FROM creator_scenes WHERE id = ? AND user_id = ?").get(sceneId, userId)) throw new Error("Scene not found.");
  const parent = parentAssetId ? db.prepare("SELECT version FROM creator_assets WHERE id = ? AND user_id = ?").get(parentAssetId, userId) : null;
  if (parentAssetId && !parent) throw new Error("Parent asset not found.");
  const assetId = id("asset"); const timestamp = now(); const version = parent ? Number(parent.version) + 1 : 1;
  db.prepare(`INSERT INTO creator_assets (id,user_id,project_id,scene_id,asset_type,name,source,mime_type,storage_uri,local_path,version,parent_asset_id,reusable,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(assetId, userId, projectId, sceneId, assetType, String(name || "Untitled Asset").trim(), source, mimeType, storageUri, localPath, version, parentAssetId, reusable ? 1 : 0, json(metadata), timestamp, timestamp);
  return { id: assetId, projectId, sceneId, assetType, name, source, mimeType, storageUri, version, parentAssetId, reusable: Boolean(reusable), metadata, status: "ready" };
}

export async function listAssets({ userId, projectId = null, assetType = null, reusable = null }) {
  const db = await getPlatformDb();
  const clauses = ["user_id = ?"]; const values = [userId];
  if (projectId) { clauses.push("project_id = ?"); values.push(projectId); }
  if (assetType) { clauses.push("asset_type = ?"); values.push(assetType); }
  if (reusable !== null) { clauses.push("reusable = ?"); values.push(reusable ? 1 : 0); }
  return db.prepare(`SELECT * FROM creator_assets WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC`).all(...values).map((row) => ({ id: row.id, projectId: row.project_id, sceneId: row.scene_id, assetType: row.asset_type, name: row.name, status: row.status, source: row.source, mimeType: row.mime_type, storageUri: row.storage_uri, version: row.version, parentAssetId: row.parent_asset_id, reusable: Boolean(row.reusable), metadata: parse(row.metadata_json), createdAt: row.created_at, updatedAt: row.updated_at }));
}

export async function getProjectLibrary({ userId, projectId }) {
  const db = await getPlatformDb();
  if (!ownedProject(db, projectId, userId)) throw new Error("Project not found.");
  const episodes = db.prepare("SELECT * FROM creator_episodes WHERE user_id = ? AND project_id = ? ORDER BY episode_number").all(userId, projectId);
  const scenes = db.prepare("SELECT * FROM creator_scenes WHERE user_id = ? AND project_id = ? ORDER BY scene_number").all(userId, projectId);
  const assets = await listAssets({ userId, projectId });
  return { projectId, episodes, scenes, assets, counts: { episodes: episodes.length, scenes: scenes.length, assets: assets.length } };
}

export { ASSET_TYPES };
