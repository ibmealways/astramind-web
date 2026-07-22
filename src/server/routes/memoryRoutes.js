import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import { storeMemory, recallMemory } from "../../services/memoryService.js";

const router=express.Router();
router.use(requireAuth);
router.post("/store",(req,res)=>{const content=String(req.body?.content||"").trim();if(!content)return res.status(400).json({ok:false,error:"content is required."});storeMemory({userId:req.user.id,content,type:req.body?.type||"semantic",tags:req.body?.tags||[]});res.status(201).json({ok:true});});
router.post("/search",(req,res)=>{const query=String(req.body?.query?.topic||req.body?.query||"").trim();if(!query)return res.status(400).json({ok:false,error:"query is required."});res.json(recallMemory(query,req.user.id));});
export default router;
