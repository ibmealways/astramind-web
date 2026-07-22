import express from "express";
import db from "../db/sqlite.js";
import { getLivePrice } from "../../core/finance/marketData.js";
import { generateLocalFinanceDialogue } from "../../core/finance/FinanceDialogueEngine.js";

db.exec(`CREATE TABLE IF NOT EXISTS finance_positions (user_id TEXT NOT NULL,symbol TEXT NOT NULL,amount REAL NOT NULL,avg_price REAL NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,symbol));CREATE TABLE IF NOT EXISTS finance_watchlist (user_id TEXT NOT NULL,symbol TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,symbol));`);
const router=express.Router();
const symbol=(value)=>String(value||"").trim().toUpperCase().replace(/[^A-Z0-9.-]/g,"").slice(0,15);
router.post("/analyze",(req,res)=>{
  const transactions=Array.isArray(req.body?.transactions)?req.body.transactions:[];
  const normalized=transactions
    .map((entry)=>({type:String(entry?.type||"").toLowerCase(),amount:Number(entry?.amount||0)}))
    .filter((entry)=>Number.isFinite(entry.amount)&&entry.amount>=0);
  const income=normalized.filter((entry)=>entry.type==="income").reduce((total,entry)=>total+entry.amount,0);
  const expenses=normalized.filter((entry)=>entry.type==="expense").reduce((total,entry)=>total+entry.amount,0);
  const net=income-expenses;
  const savingsRate=income>0?Math.max(0,(net/income)*100):0;
  res.json({ok:true,data:{income,expenses,net,savingsRate:Number(savingsRate.toFixed(1)),transactionCount:normalized.length}});
});
router.post("/guidance",(req,res)=>{
  const message=String(req.body?.message||"").trim();
  if(!message)return res.status(400).json({ok:false,code:"FINANCE_PROMPT_REQUIRED",error:"A finance question is required."});
  try{return res.json(generateLocalFinanceDialogue({message,transactions:req.body?.transactions,context:req.body?.context}));}
  catch(error){console.error("[Finance Dialogue]",error);return res.status(500).json({ok:false,code:"FINANCE_GUIDANCE_FAILED",error:error.message||"Finance guidance failed."});}
});
router.get("/portfolio",async(req,res)=>{const rows=db.prepare("SELECT symbol,amount,avg_price AS avgPrice FROM finance_positions WHERE user_id=? ORDER BY symbol").all(req.user.id);const data=await Promise.all(rows.map(async(row)=>{const live=await getLivePrice(row.symbol);const current=Number(live?.price||0),value=current*row.amount,cost=row.avgPrice*row.amount;return {...row,current,value,pnl:value-cost};}));res.json({data});});
router.post("/portfolio",(req,res)=>{const ticker=symbol(req.body?.symbol),amount=Number(req.body?.amount),avgPrice=Number(req.body?.avgPrice);if(!ticker||!Number.isFinite(amount)||amount<=0||!Number.isFinite(avgPrice)||avgPrice<0)return res.status(400).json({ok:false,error:"A valid symbol, positive amount, and average price are required."});db.prepare("INSERT INTO finance_positions (user_id,symbol,amount,avg_price,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,symbol) DO UPDATE SET amount=excluded.amount,avg_price=excluded.avg_price,updated_at=excluded.updated_at").run(req.user.id,ticker,amount,avgPrice,new Date().toISOString());res.status(201).json({ok:true,data:{symbol:ticker,amount,avgPrice}});});
router.delete("/portfolio/:symbol",(req,res)=>{const result=db.prepare("DELETE FROM finance_positions WHERE user_id=? AND symbol=?").run(req.user.id,symbol(req.params.symbol));res.status(result.changes?200:404).json({ok:Boolean(result.changes)});});
router.get("/watchlist",async(req,res)=>{const rows=db.prepare("SELECT symbol FROM finance_watchlist WHERE user_id=? ORDER BY symbol").all(req.user.id);const data=await Promise.all(rows.map(async({symbol:ticker})=>{const live=await getLivePrice(ticker);return {symbol:ticker,price:live?.price||0,type:live?.type||"unknown"};}));res.json({data});});
router.post("/watchlist",(req,res)=>{const ticker=symbol(req.body?.symbol);if(!ticker)return res.status(400).json({ok:false,error:"A valid symbol is required."});db.prepare("INSERT OR IGNORE INTO finance_watchlist (user_id,symbol,created_at) VALUES (?,?,?)").run(req.user.id,ticker,new Date().toISOString());res.status(201).json({ok:true,data:{symbol:ticker}});});
router.delete("/watchlist/:symbol",(req,res)=>{const result=db.prepare("DELETE FROM finance_watchlist WHERE user_id=? AND symbol=?").run(req.user.id,symbol(req.params.symbol));res.status(result.changes?200:404).json({ok:Boolean(result.changes)});});
export default router;
