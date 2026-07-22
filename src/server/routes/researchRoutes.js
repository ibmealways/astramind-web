import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { saveResearchSource, getRecentResearchSources } from "../../services/projectPersistenceService.js";

const router=express.Router();
router.use(requireAuth);
router.post("/save",async(req,res)=>{try{const source=req.body?.source||req.body||{};const record=await saveResearchSource({category:req.body?.category,topic:req.body?.topic,title:source.title,url:source.url,sourceName:source.sourceName,snippet:source.snippet,notes:req.body?.notes,userId:req.user.id});res.status(201).json({ok:true,source:record});}catch(error){res.status(400).json({ok:false,error:error.message});}});
router.get("/sources",async(req,res)=>{try{const sources=await getRecentResearchSources(req.query.limit,req.user.id);res.json({ok:true,sources});}catch(error){res.status(500).json({ok:false,error:error.message});}});
export default router;
