import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveCreatorMemory } from "../core/memory/creatorMemory.js";
import { updateCreatorProfile } from "../core/brain/creatorBrainApi.js";
import "../styles/creator-setup.css";

export default function CreatorSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ niche: "", platform: "TikTok", tone: "Educational", goal: "" });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const [saving,setSaving]=useState(false);
  const submit = async () => {
    if (!form.niche.trim() || !form.goal.trim()) return window.alert("Please complete your niche and primary outcome.");
    setSaving(true);
    try {
      await updateCreatorProfile({displayName:"",primaryIdentity:form.niche,mission:form.goal,writingTone:form.tone,preferredPlatforms:[form.platform],preferences:{niche:form.niche,platform:form.platform}});
      saveCreatorMemory(form);
      navigate("/creator-dashboard");
    } catch(error){window.alert(error.message);} finally {setSaving(false);}
  };
  return <div className="creator-setup-page os-page-enter"><section className="creator-setup-card">
    <div className="creator-setup-eyebrow">CREATOR IDENTITY</div><h1>🚀 Initialize AstraMind</h1>
    <p>Define your creator identity so AstraMind can align its intelligence, recommendations, and production defaults.</p>
    <div className="creator-setup-grid">
      <label><span>Primary niche</span><input className="creator-setup-control" placeholder="News, finance, science, education..." value={form.niche} onChange={update("niche")} /></label>
      <label><span>Primary platform</span><select className="creator-setup-control" value={form.platform} onChange={update("platform")}><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Podcast</option><option>Multi-platform</option></select></label>
      <label><span>Default voice</span><select className="creator-setup-control" value={form.tone} onChange={update("tone")}><option>Educational</option><option>Entertaining</option><option>Bold</option><option>Calm</option><option>Cinematic</option></select></label>
      <label><span>Primary outcome</span><input className="creator-setup-control" placeholder="Growth, monetization, authority..." value={form.goal} onChange={update("goal")} /></label>
    </div><button type="button" onClick={submit} disabled={saving} className="creator-setup-submit">{saving?"Calibrating...":"Initialize AstraMind"}</button>
  </section></div>;
}
