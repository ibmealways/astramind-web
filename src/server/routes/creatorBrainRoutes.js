import express from "express";
import { randomUUID } from "crypto";
import db from "../db/sqlite.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();
router.use(requireAuth);

const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const now = () => new Date().toISOString();
const profile = (row) => row ? ({ displayName:row.display_name||"",primaryIdentity:row.primary_identity||"",mission:row.mission||"",writingTone:row.writing_tone||"",preferredPlatforms:parse(row.preferred_platforms,[]),businesses:parse(row.businesses,[]),activeGoals:parse(row.active_goals,[]),preferences:parse(row.preferences,{}),updatedAt:row.updated_at }) : null;
const project = (row) => ({ id:row.id,title:row.title,type:row.type||"",status:row.status||"active",summary:row.summary||"",metadata:parse(row.metadata,{}),updatedAt:row.updated_at,createdAt:row.created_at });
const memory = (row) => ({ id:row.id,category:row.category,title:row.title||"",content:row.content,tags:parse(row.tags,[]),linkedProjectId:row.linked_project_id||"",importance:row.importance||3,updatedAt:row.updated_at,createdAt:row.created_at });

router.get("/health", (_req,res) => res.json({ok:true,service:"Creator Brain",tenantIsolation:true,persistence:true}));
router.get("/profile", (req,res) => res.json({ok:true,profile:profile(db.prepare("SELECT * FROM creator_profiles WHERE user_id=?").get(req.user.id))}));
router.patch("/profile", (req,res) => {
  const value=req.body||{}; const timestamp=now();
  db.prepare(`INSERT INTO creator_profiles (user_id,display_name,primary_identity,mission,writing_tone,preferred_platforms,businesses,active_goals,preferences,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,primary_identity=excluded.primary_identity,mission=excluded.mission,writing_tone=excluded.writing_tone,preferred_platforms=excluded.preferred_platforms,businesses=excluded.businesses,active_goals=excluded.active_goals,preferences=excluded.preferences,updated_at=excluded.updated_at`)
    .run(req.user.id,value.displayName||"",value.primaryIdentity||"",value.mission||"",value.writingTone||"",JSON.stringify(value.preferredPlatforms||[]),JSON.stringify(value.businesses||[]),JSON.stringify(value.activeGoals||[]),JSON.stringify(value.preferences||{}),timestamp);
  res.json({ok:true,profile:profile(db.prepare("SELECT * FROM creator_profiles WHERE user_id=?").get(req.user.id))});
});

router.get("/projects", (req,res) => { const rows=db.prepare("SELECT * FROM creator_projects WHERE user_id=? ORDER BY datetime(updated_at) DESC").all(req.user.id); res.json({ok:true,count:rows.length,projects:rows.map(project)}); });
router.post("/projects", (req,res) => {
  const value=req.body||{}; const id=String(value.id||randomUUID()); if(!String(value.title||"").trim()) return res.status(400).json({ok:false,error:"Project title is required."}); const timestamp=now();
  db.prepare("INSERT INTO creator_projects (id,title,type,status,summary,metadata,updated_at,created_at,user_id) VALUES (?,?,?,?,?,?,?,?,?)").run(id,value.title,value.type||"",value.status||"active",value.summary||"",JSON.stringify(value.metadata||{}),timestamp,timestamp,req.user.id);
  res.status(201).json({ok:true,project:project(db.prepare("SELECT * FROM creator_projects WHERE id=? AND user_id=?").get(id,req.user.id))});
});
router.patch("/projects/:id", (req,res) => {
  const row=db.prepare("SELECT * FROM creator_projects WHERE id=? AND user_id=?").get(req.params.id,req.user.id); if(!row)return res.status(404).json({ok:false,error:"Project not found."}); const value=req.body||{};
  db.prepare("UPDATE creator_projects SET title=?,type=?,status=?,summary=?,metadata=?,updated_at=? WHERE id=? AND user_id=?").run(value.title??row.title,value.type??row.type,value.status??row.status,value.summary??row.summary,JSON.stringify(value.metadata??parse(row.metadata,{})),now(),row.id,req.user.id);
  res.json({ok:true,project:project(db.prepare("SELECT * FROM creator_projects WHERE id=? AND user_id=?").get(row.id,req.user.id))});
});
router.delete("/projects/:id",(req,res)=>{const result=db.prepare("DELETE FROM creator_projects WHERE id=? AND user_id=?").run(req.params.id,req.user.id);return result.changes?res.json({ok:true,deletedId:req.params.id}):res.status(404).json({ok:false,error:"Project not found."});});

router.get("/memory",(req,res)=>{const conditions=["user_id=?"],params=[req.user.id];if(req.query.category){conditions.push("category=?");params.push(String(req.query.category));}if(req.query.linkedProjectId){conditions.push("linked_project_id=?");params.push(String(req.query.linkedProjectId));}const rows=db.prepare(`SELECT * FROM creator_memory_entries WHERE ${conditions.join(" AND ")} ORDER BY importance DESC,datetime(updated_at) DESC`).all(...params);res.json({ok:true,count:rows.length,entries:rows.map(memory)});});
router.post("/memory",(req,res)=>{const value=req.body||{};if(!value.category||!value.content)return res.status(400).json({ok:false,error:"category and content are required."});const id=String(value.id||randomUUID()),timestamp=now();db.prepare("INSERT INTO creator_memory_entries (id,category,title,content,tags,linked_project_id,importance,updated_at,created_at,user_id) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id,value.category,value.title||"",value.content,JSON.stringify(value.tags||[]),value.linkedProjectId||"",Number(value.importance)||3,timestamp,timestamp,req.user.id);res.status(201).json({ok:true,entry:memory(db.prepare("SELECT * FROM creator_memory_entries WHERE id=? AND user_id=?").get(id,req.user.id))});});
router.patch("/memory/:id",(req,res)=>{const row=db.prepare("SELECT * FROM creator_memory_entries WHERE id=? AND user_id=?").get(req.params.id,req.user.id);if(!row)return res.status(404).json({ok:false,error:"Memory entry not found."});const value=req.body||{};db.prepare("UPDATE creator_memory_entries SET category=?,title=?,content=?,tags=?,linked_project_id=?,importance=?,updated_at=? WHERE id=? AND user_id=?").run(value.category??row.category,value.title??row.title,value.content??row.content,JSON.stringify(value.tags??parse(row.tags,[])),value.linkedProjectId??row.linked_project_id,Number(value.importance??row.importance),now(),row.id,req.user.id);res.json({ok:true,entry:memory(db.prepare("SELECT * FROM creator_memory_entries WHERE id=? AND user_id=?").get(row.id,req.user.id))});});
router.delete("/memory/:id",(req,res)=>{const result=db.prepare("DELETE FROM creator_memory_entries WHERE id=? AND user_id=?").run(req.params.id,req.user.id);return result.changes?res.json({ok:true,deletedId:req.params.id}):res.status(404).json({ok:false,error:"Memory entry not found."});});

router.get("/dashboard",(req,res)=>{const p=profile(db.prepare("SELECT * FROM creator_profiles WHERE user_id=?").get(req.user.id));const projects=db.prepare("SELECT * FROM creator_projects WHERE user_id=? ORDER BY datetime(updated_at) DESC LIMIT 8").all(req.user.id).map(project);const recentMemory=db.prepare("SELECT * FROM creator_memory_entries WHERE user_id=? ORDER BY importance DESC,datetime(updated_at) DESC LIMIT 12").all(req.user.id).map(memory);const audioSessions=db.prepare("SELECT id,title,genre,updated_at AS updatedAt,created_at AS createdAt FROM audio_sessions WHERE user_id=? ORDER BY datetime(updated_at) DESC LIMIT 8").all(req.user.id);const suggestions=[];if(!projects.length)suggestions.push("Create your first tracked project so AstraMind can build persistent context.");if(!p?.mission)suggestions.push("Add your mission so Chappy can align its recommendations.");if(!recentMemory.length)suggestions.push("Save research and strategic notes into persistent memory.");res.json({ok:true,dashboard:{profile:p,activeProjects:projects,recentMemory,audioSessions,suggestions}});});

export default router;
