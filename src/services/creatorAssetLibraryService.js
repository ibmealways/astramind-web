import crypto from "crypto";
import { getPlatformDb } from "../server/db/platformDb.js";
import { creatorCloudQuery, usingCloudCreatorDb } from "../server/db/creatorCloudDb.js";

const ASSET_TYPES = new Set(["character", "location", "prop", "voice", "image", "video", "music", "sound-effect", "script", "subtitle", "export", "style-reference"]);
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
const json = (value) => JSON.stringify(value || {});
const parse = (value) => { if (value && typeof value === "object") return value; try { return JSON.parse(value || "{}"); } catch { return {}; } };
const date = (value) => value instanceof Date ? value.toISOString() : value;

const mapProject = (row) => ({ id: row.id, type: row.type, title: row.title, summary: row.summary, metadata: parse(row.metadata_json), createdAt: date(row.created_at), updatedAt: date(row.updated_at) });
const mapAsset = (row) => ({ id: row.id, projectId: row.project_id, sceneId: row.scene_id, assetType: row.asset_type, name: row.name, status: row.status, source: row.source, mimeType: row.mime_type, storageUri: row.storage_uri, version: row.version, parentAssetId: row.parent_asset_id, reusable: Boolean(row.reusable), metadata: parse(row.metadata_json), createdAt: date(row.created_at), updatedAt: date(row.updated_at) });

function ownedProject(db, projectId, userId) { return db.prepare("SELECT id FROM platform_projects WHERE id = ? AND user_id = ?").get(projectId, userId); }
async function cloudOwnedProject(projectId, userId) { return (await creatorCloudQuery("SELECT id FROM creator_projects WHERE id = $1 AND user_id = $2", [projectId, userId])).rows[0]; }

export async function createCreatorProject({ userId, title, type = "video-series", summary = "", metadata = {} }) {
  const projectId = id("project"); const timestamp = now(); const cleanTitle = String(title || "Untitled Project").trim();
  if (usingCloudCreatorDb) {
    const result = await creatorCloudQuery("INSERT INTO creator_projects (id,user_id,type,title,summary,metadata_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$7) RETURNING *", [projectId, userId, type, cleanTitle, String(summary || "").trim(), json(metadata), timestamp]);
    return { ...mapProject(result.rows[0]), userId };
  }
  const db = await getPlatformDb();
  db.prepare(`INSERT INTO platform_projects (id,user_id,type,title,summary,topic,tone,audience,intensity,metadata_json,book_json,created_at,updated_at) VALUES (?,?,?,?,?,'','','','medium',?,'{}',?,?)`).run(projectId, userId, type, cleanTitle, String(summary || "").trim(), json(metadata), timestamp, timestamp);
  return { id: projectId, userId, type, title: cleanTitle, summary, metadata, createdAt: timestamp, updatedAt: timestamp };
}

export async function listCreatorProjects(userId) {
  if (usingCloudCreatorDb) return (await creatorCloudQuery("SELECT * FROM creator_projects WHERE user_id = $1 ORDER BY updated_at DESC", [userId])).rows.map(mapProject);
  const db = await getPlatformDb();
  return db.prepare("SELECT * FROM platform_projects WHERE user_id = ? ORDER BY updated_at DESC").all(userId).map(mapProject);
}

export async function updateCreatorProject({ userId, projectId, title, summary, type, metadata }) {
  if (usingCloudCreatorDb) {
    const current = (await creatorCloudQuery("SELECT * FROM creator_projects WHERE id = $1 AND user_id = $2", [projectId, userId])).rows[0];
    if (!current) throw new Error("Project not found.");
    const result = await creatorCloudQuery("UPDATE creator_projects SET title=$1,summary=$2,type=$3,metadata_json=$4::jsonb,updated_at=NOW() WHERE id=$5 AND user_id=$6 RETURNING *", [String(title ?? current.title).trim() || "Untitled Project", String(summary ?? current.summary), String(type ?? current.type), json(metadata ?? current.metadata_json), projectId, userId]);
    return { ...mapProject(result.rows[0]), userId };
  }
  const db = await getPlatformDb(); if (!ownedProject(db, projectId, userId)) throw new Error("Project not found.");
  const current = db.prepare("SELECT * FROM platform_projects WHERE id = ? AND user_id = ?").get(projectId, userId); const timestamp = now();
  db.prepare("UPDATE platform_projects SET title = ?, summary = ?, type = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(String(title ?? current.title).trim() || "Untitled Project", String(summary ?? current.summary), String(type ?? current.type), json(metadata ?? parse(current.metadata_json)), timestamp, projectId, userId);
  return { id: projectId, userId, title: String(title ?? current.title).trim() || "Untitled Project", summary: String(summary ?? current.summary), type: String(type ?? current.type), metadata: metadata ?? parse(current.metadata_json), updatedAt: timestamp };
}

export async function createEpisode({ userId, projectId, title, episodeNumber = 1, synopsis = "", metadata = {} }) {
  const episodeId = id("episode"); const timestamp = now(); const cleanTitle = String(title || `Episode ${episodeNumber}`).trim();
  if (usingCloudCreatorDb) {
    if (!await cloudOwnedProject(projectId, userId)) throw new Error("Project not found.");
    await creatorCloudQuery("INSERT INTO creator_episodes (id,user_id,project_id,title,episode_number,synopsis,metadata_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$8)", [episodeId,userId,projectId,cleanTitle,Number(episodeNumber),String(synopsis || ""),json(metadata),timestamp]);
  } else {
    const db = await getPlatformDb(); if (!ownedProject(db, projectId, userId)) throw new Error("Project not found.");
    db.prepare("INSERT INTO creator_episodes (id,user_id,project_id,title,episode_number,synopsis,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(episodeId,userId,projectId,cleanTitle,Number(episodeNumber),String(synopsis || ""),json(metadata),timestamp,timestamp);
  }
  return { id: episodeId, projectId, title: cleanTitle, episodeNumber: Number(episodeNumber), synopsis, metadata, status: "draft" };
}

export async function updateEpisode({ userId, projectId, episodeId, title, episodeNumber, synopsis, status, metadata }) {
  if (usingCloudCreatorDb) {
    const current = (await creatorCloudQuery("SELECT * FROM creator_episodes WHERE id=$1 AND project_id=$2 AND user_id=$3",[episodeId,projectId,userId])).rows[0]; if (!current) throw new Error("Episode not found.");
    const result = await creatorCloudQuery("UPDATE creator_episodes SET title=$1,episode_number=$2,synopsis=$3,status=$4,metadata_json=$5::jsonb,updated_at=NOW() WHERE id=$6 AND user_id=$7 RETURNING *",[String(title??current.title).trim()||`Episode ${episodeNumber??current.episode_number}`,Number(episodeNumber??current.episode_number),String(synopsis??current.synopsis),String(status??current.status),json(metadata??current.metadata_json),episodeId,userId]); const row=result.rows[0];
    return { id: row.id, projectId: row.project_id, title: row.title, episodeNumber: row.episode_number, synopsis: row.synopsis, status: row.status, updatedAt: date(row.updated_at) };
  }
  const db=await getPlatformDb(); const current=db.prepare("SELECT * FROM creator_episodes WHERE id = ? AND project_id = ? AND user_id = ?").get(episodeId,projectId,userId); if(!current) throw new Error("Episode not found."); const timestamp=now();
  db.prepare("UPDATE creator_episodes SET title = ?, episode_number = ?, synopsis = ?, status = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(String(title??current.title).trim()||`Episode ${episodeNumber??current.episode_number}`,Number(episodeNumber??current.episode_number),String(synopsis??current.synopsis),String(status??current.status),json(metadata??parse(current.metadata_json)),timestamp,episodeId,userId);
  return { id:episodeId,projectId,title:title??current.title,episodeNumber:Number(episodeNumber??current.episode_number),synopsis:synopsis??current.synopsis,status:status??current.status,updatedAt:timestamp };
}

export async function createScene({ userId, projectId, episodeId = null, title, sceneNumber = 1, durationSeconds = 5, script = "", visualPrompt = "", productionMethod = "", metadata = {} }) {
  const sceneId=id("scene"); const timestamp=now(); const cleanTitle=String(title||`Scene ${sceneNumber}`).trim(); const duration=Math.max(1,Number(durationSeconds));
  if(usingCloudCreatorDb){ if(!await cloudOwnedProject(projectId,userId)) throw new Error("Project not found."); if(episodeId && !(await creatorCloudQuery("SELECT id FROM creator_episodes WHERE id=$1 AND project_id=$2 AND user_id=$3",[episodeId,projectId,userId])).rows[0]) throw new Error("Episode not found."); await creatorCloudQuery("INSERT INTO creator_scenes (id,user_id,project_id,episode_id,scene_number,title,duration_seconds,script,visual_prompt,production_method,metadata_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$12)",[sceneId,userId,projectId,episodeId,Number(sceneNumber),cleanTitle,duration,String(script||""),String(visualPrompt||""),String(productionMethod||""),json(metadata),timestamp]); }
  else { const db=await getPlatformDb(); if(!ownedProject(db,projectId,userId)) throw new Error("Project not found."); if(episodeId&&!db.prepare("SELECT id FROM creator_episodes WHERE id = ? AND project_id = ? AND user_id = ?").get(episodeId,projectId,userId)) throw new Error("Episode not found."); db.prepare("INSERT INTO creator_scenes (id,user_id,project_id,episode_id,scene_number,title,duration_seconds,script,visual_prompt,production_method,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(sceneId,userId,projectId,episodeId,Number(sceneNumber),cleanTitle,duration,String(script||""),String(visualPrompt||""),String(productionMethod||""),json(metadata),timestamp,timestamp); }
  return { id:sceneId,projectId,episodeId,sceneNumber:Number(sceneNumber),title:cleanTitle,durationSeconds:duration,status:"draft" };
}

export async function updateScene({ userId, projectId, sceneId, episodeId, title, sceneNumber, durationSeconds, script, visualPrompt, productionMethod, status, metadata }) {
  if(usingCloudCreatorDb){ const current=(await creatorCloudQuery("SELECT * FROM creator_scenes WHERE id=$1 AND project_id=$2 AND user_id=$3",[sceneId,projectId,userId])).rows[0]; if(!current) throw new Error("Scene not found."); const result=await creatorCloudQuery("UPDATE creator_scenes SET episode_id=$1,title=$2,scene_number=$3,duration_seconds=$4,script=$5,visual_prompt=$6,production_method=$7,status=$8,metadata_json=$9::jsonb,updated_at=NOW() WHERE id=$10 AND user_id=$11 RETURNING *",[episodeId===undefined?current.episode_id:(episodeId||null),String(title??current.title).trim()||`Scene ${sceneNumber??current.scene_number}`,Number(sceneNumber??current.scene_number),Math.max(1,Number(durationSeconds??current.duration_seconds)),String(script??current.script),String(visualPrompt??current.visual_prompt),String(productionMethod??current.production_method),String(status??current.status),json(metadata??current.metadata_json),sceneId,userId]); const row=result.rows[0]; return {id:row.id,projectId:row.project_id,episodeId:row.episode_id,title:row.title,sceneNumber:row.scene_number,durationSeconds:row.duration_seconds,status:row.status,updatedAt:date(row.updated_at)}; }
  const db=await getPlatformDb(); const current=db.prepare("SELECT * FROM creator_scenes WHERE id = ? AND project_id = ? AND user_id = ?").get(sceneId,projectId,userId); if(!current) throw new Error("Scene not found."); const timestamp=now(); db.prepare("UPDATE creator_scenes SET episode_id = ?, title = ?, scene_number = ?, duration_seconds = ?, script = ?, visual_prompt = ?, production_method = ?, status = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND user_id = ?").run(episodeId===undefined?current.episode_id:(episodeId||null),String(title??current.title).trim()||`Scene ${sceneNumber??current.scene_number}`,Number(sceneNumber??current.scene_number),Math.max(1,Number(durationSeconds??current.duration_seconds)),String(script??current.script),String(visualPrompt??current.visual_prompt),String(productionMethod??current.production_method),String(status??current.status),json(metadata??parse(current.metadata_json)),timestamp,sceneId,userId); return {id:sceneId,projectId,episodeId:episodeId===undefined?current.episode_id:episodeId,title:title??current.title,sceneNumber:Number(sceneNumber??current.scene_number),durationSeconds:Math.max(1,Number(durationSeconds??current.duration_seconds)),status:status??current.status,updatedAt:timestamp};
}

export async function registerAsset({ userId, projectId = null, sceneId = null, assetType, name, source = "user", mimeType = "", storageUri = "", localPath = "", parentAssetId = null, reusable = true, metadata = {} }) {
  if(!ASSET_TYPES.has(assetType)) throw new Error(`Unsupported asset type: ${assetType}.`); const assetId=id("asset"); const timestamp=now(); let version=1;
  if(usingCloudCreatorDb){ if(projectId&&!await cloudOwnedProject(projectId,userId)) throw new Error("Project not found."); if(sceneId&&!(await creatorCloudQuery("SELECT id FROM creator_scenes WHERE id=$1 AND user_id=$2",[sceneId,userId])).rows[0]) throw new Error("Scene not found."); if(parentAssetId){const parent=(await creatorCloudQuery("SELECT version FROM creator_assets WHERE id=$1 AND user_id=$2",[parentAssetId,userId])).rows[0];if(!parent)throw new Error("Parent asset not found.");version=Number(parent.version)+1;} await creatorCloudQuery("INSERT INTO creator_assets (id,user_id,project_id,scene_id,asset_type,name,source,mime_type,storage_uri,local_path,version,parent_asset_id,reusable,metadata_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$15)",[assetId,userId,projectId,sceneId,assetType,String(name||"Untitled Asset").trim(),source,mimeType,storageUri,localPath,version,parentAssetId,Boolean(reusable),json(metadata),timestamp]); }
  else {const db=await getPlatformDb();if(projectId&&!ownedProject(db,projectId,userId))throw new Error("Project not found.");if(sceneId&&!db.prepare("SELECT id FROM creator_scenes WHERE id = ? AND user_id = ?").get(sceneId,userId))throw new Error("Scene not found.");const parent=parentAssetId?db.prepare("SELECT version FROM creator_assets WHERE id = ? AND user_id = ?").get(parentAssetId,userId):null;if(parentAssetId&&!parent)throw new Error("Parent asset not found.");version=parent?Number(parent.version)+1:1;db.prepare(`INSERT INTO creator_assets (id,user_id,project_id,scene_id,asset_type,name,source,mime_type,storage_uri,local_path,version,parent_asset_id,reusable,metadata_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(assetId,userId,projectId,sceneId,assetType,String(name||"Untitled Asset").trim(),source,mimeType,storageUri,localPath,version,parentAssetId,reusable?1:0,json(metadata),timestamp,timestamp);}
  return {id:assetId,projectId,sceneId,assetType,name,source,mimeType,storageUri,version,parentAssetId,reusable:Boolean(reusable),metadata,status:"ready"};
}

export async function listAssets({ userId, projectId = null, assetType = null, reusable = null }) {
  if(usingCloudCreatorDb){const clauses=["user_id = $1"];const values=[userId];if(projectId){values.push(projectId);clauses.push(`project_id = $${values.length}`);}if(assetType){values.push(assetType);clauses.push(`asset_type = $${values.length}`);}if(reusable!==null){values.push(Boolean(reusable));clauses.push(`reusable = $${values.length}`);}return (await creatorCloudQuery(`SELECT * FROM creator_assets WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC`,values)).rows.map(mapAsset);}
  const db=await getPlatformDb();const clauses=["user_id = ?"];const values=[userId];if(projectId){clauses.push("project_id = ?");values.push(projectId);}if(assetType){clauses.push("asset_type = ?");values.push(assetType);}if(reusable!==null){clauses.push("reusable = ?");values.push(reusable?1:0);}return db.prepare(`SELECT * FROM creator_assets WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC`).all(...values).map(mapAsset);
}

export async function getProjectLibrary({ userId, projectId }) {
  if(usingCloudCreatorDb){if(!await cloudOwnedProject(projectId,userId))throw new Error("Project not found.");const [episodes,scenes,assets]=await Promise.all([creatorCloudQuery("SELECT * FROM creator_episodes WHERE user_id=$1 AND project_id=$2 ORDER BY episode_number",[userId,projectId]),creatorCloudQuery("SELECT * FROM creator_scenes WHERE user_id=$1 AND project_id=$2 ORDER BY scene_number",[userId,projectId]),listAssets({userId,projectId})]);return {projectId,episodes:episodes.rows,scenes:scenes.rows,assets,counts:{episodes:episodes.rows.length,scenes:scenes.rows.length,assets:assets.length}};}
  const db=await getPlatformDb();if(!ownedProject(db,projectId,userId))throw new Error("Project not found.");const episodes=db.prepare("SELECT * FROM creator_episodes WHERE user_id = ? AND project_id = ? ORDER BY episode_number").all(userId,projectId);const scenes=db.prepare("SELECT * FROM creator_scenes WHERE user_id = ? AND project_id = ? ORDER BY scene_number").all(userId,projectId);const assets=await listAssets({userId,projectId});return {projectId,episodes,scenes,assets,counts:{episodes:episodes.length,scenes:scenes.length,assets:assets.length}};
}

export { ASSET_TYPES };
