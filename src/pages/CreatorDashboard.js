import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCreatorDashboard } from "../core/brain/creatorBrainApi.js";
import "../styles/creator-dashboard.css";

export default function CreatorDashboard(){
  const navigate=useNavigate();const [dashboard,setDashboard]=useState(null);const [error,setError]=useState("");
  useEffect(()=>{getCreatorDashboard().then((data)=>setDashboard(data.dashboard)).catch((reason)=>setError(reason.message));},[]);
  const projects=useMemo(()=>[
    ...(dashboard?.activeProjects||[]).map((item)=>({...item,kind:"Production"})),
    ...(dashboard?.audioSessions||[]).map((item)=>({...item,kind:"Audio"})),
    ...(dashboard?.recentMemory||[]).map((item)=>({...item,kind:"Memory"})),
  ].sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)),[dashboard]);
  const count=(kind)=>projects.filter((item)=>item.kind===kind).length;
  return <div className="creator-dashboard-page os-page-enter">
    <header className="creator-dashboard-header"><div><span>CREATOR OPERATIONS</span><h1>Creator Dashboard</h1><p>Your authenticated AstraMind projects, memory, and production activity.</p></div><button className="creator-btn primary" onClick={()=>navigate("/content")}>Start a project</button></header>
    {error&&<div className="creator-empty"><strong>Creator Brain unavailable.</strong><span>{error}</span></div>}
    <div className="creator-dashboard-stats"><div className="creator-stat"><strong>{projects.length}</strong><span>Total artifacts</span></div><div className="creator-stat"><strong>{count("Production")}</strong><span>Production projects</span></div><div className="creator-stat"><strong>{count("Audio")}</strong><span>Audio sessions</span></div><div className="creator-stat"><strong>{count("Memory")}</strong><span>Memory entries</span></div></div>
    <section className="creator-card creator-card-wide"><h2>Recent work</h2>{!dashboard&&!error?<div className="creator-empty"><strong>Synchronizing Creator Brain...</strong></div>:projects.length===0?<div className="creator-empty"><strong>No persisted projects yet.</strong><span>Start in Creator Studio or save a Research Workspace artifact.</span></div>:<div className="creator-list">{projects.slice(0,12).map((item,index)=><article className="creator-list-item" key={item.id||`${item.kind}-${index}`}><div><div className="creator-list-title">{item.title||item.topic||"Untitled artifact"}</div><div className="creator-list-meta">{item.type||item.category||item.genre||item.kind}</div></div><time>{new Date(item.updatedAt||item.createdAt||Date.now()).toLocaleDateString()}</time></article>)}</div>}</section>
  </div>;
}
