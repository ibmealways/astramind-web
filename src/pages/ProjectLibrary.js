import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./ProjectLibrary.css";

const API = process.env.REACT_APP_API_URL || "";
const DRAFT_KEY = "aigenikz_project_library_draft_v1";
const TABS = ["Overview", "Episodes & Scenes", "Characters", "Locations", "Voices", "Images & Video"];
const EMPTY_PROJECT = { title: "", summary: "", type: "video-series" };
const EMPTY_EPISODE = { title: "", episodeNumber: 1, synopsis: "" };
const EMPTY_SCENE = { title: "", sceneNumber: 1, durationSeconds: 6, episodeId: "", script: "", visualPrompt: "", productionMethod: "" };
const EMPTY_ASSET = { name: "", assetType: "character", storageUri: "", mimeType: "", notes: "", parentAssetId: "", reusable: true };

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}

async function request(path, options = {}) {
  const token = localStorage.getItem("astramind_token") || "";
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Project Library request failed.");
  return data;
}

function AssetPreview({ asset }) {
  if (!asset.storageUri) return <div className="library-preview-empty">{asset.assetType.slice(0, 1).toUpperCase()}</div>;
  if (asset.assetType === "image" || asset.assetType === "character" || asset.assetType === "location") return <img src={asset.storageUri} alt={asset.name} />;
  if (asset.assetType === "video") return <video src={asset.storageUri} controls preload="metadata" />;
  if (asset.assetType === "voice") return <audio src={asset.storageUri} controls preload="metadata" />;
  return <div className="library-preview-empty">{asset.assetType.slice(0, 1).toUpperCase()}</div>;
}

export default function ProjectLibrary() {
  const recovered = useMemo(readDraft, []);
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(recovered?.activeId || "");
  const [library, setLibrary] = useState(null);
  const [tab, setTab] = useState(recovered?.tab || "Overview");
  const [projectForm, setProjectForm] = useState(recovered?.projectForm || EMPTY_PROJECT);
  const [episodeForm, setEpisodeForm] = useState(recovered?.episodeForm || EMPTY_EPISODE);
  const [sceneForm, setSceneForm] = useState(recovered?.sceneForm || EMPTY_SCENE);
  const [assetForm, setAssetForm] = useState(recovered?.assetForm || EMPTY_ASSET);
  const [status, setStatus] = useState(recovered ? "Recovered an unfinished draft from this device." : "Ready");
  const [busy, setBusy] = useState(false);
  const [showNewProject, setShowNewProject] = useState(!recovered?.activeId);

  const loadProjects = useCallback(async () => {
    const data = await request("/api/creator-library/projects");
    setProjects(data.projects || []);
    setActiveId((current) => current || data.projects?.[0]?.id || "");
  }, []);

  const loadLibrary = useCallback(async (projectId) => {
    if (!projectId) { setLibrary(null); return; }
    const data = await request(`/api/creator-library/projects/${projectId}/library`);
    setLibrary(data.library);
  }, []);

  useEffect(() => { loadProjects().catch((error) => setStatus(error.message)); }, [loadProjects]);
  useEffect(() => { loadLibrary(activeId).catch((error) => setStatus(error.message)); }, [activeId, loadLibrary]);
  useEffect(() => {
    const draft = { activeId, tab, projectForm, episodeForm, sceneForm, assetForm, savedAt: new Date().toISOString() };
    const timer = setTimeout(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); setStatus((value) => value.includes("failed") ? value : "Draft autosaved on this device"); }, 500);
    return () => clearTimeout(timer);
  }, [activeId, tab, projectForm, episodeForm, sceneForm, assetForm]);

  const run = async (operation, success) => {
    setBusy(true); setStatus("Saving securely…");
    try { await operation(); await loadProjects(); if (activeId) await loadLibrary(activeId); setStatus(success); }
    catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };

  const createProject = () => run(async () => {
    const data = await request("/api/creator-library/projects", { method: "POST", body: JSON.stringify(projectForm) });
    setActiveId(data.project.id); setProjectForm(EMPTY_PROJECT); setShowNewProject(false);
  }, "Project saved permanently");

  const createEpisode = () => run(async () => {
    await request(`/api/creator-library/projects/${activeId}/episodes`, { method: "POST", body: JSON.stringify(episodeForm) });
    setEpisodeForm({ ...EMPTY_EPISODE, episodeNumber: (library?.episodes?.length || 0) + 2 });
  }, "Episode saved permanently");

  const createScene = () => run(async () => {
    await request(`/api/creator-library/projects/${activeId}/scenes`, { method: "POST", body: JSON.stringify({ ...sceneForm, episodeId: sceneForm.episodeId || null }) });
    setSceneForm({ ...EMPTY_SCENE, sceneNumber: (library?.scenes?.length || 0) + 2, episodeId: sceneForm.episodeId });
  }, "Scene saved permanently");

  const assetTypes = tab === "Characters" ? ["character"] : tab === "Locations" ? ["location"] : tab === "Voices" ? ["voice"] : ["image", "video"];
  const visibleAssets = (library?.assets || []).filter((asset) => assetTypes.includes(asset.assetType));
  const createAsset = () => run(async () => {
    await request("/api/creator-library/assets", { method: "POST", body: JSON.stringify({ ...assetForm, projectId: activeId, parentAssetId: assetForm.parentAssetId || null, metadata: { notes: assetForm.notes } }) });
    setAssetForm({ ...EMPTY_ASSET, assetType: assetTypes[0] });
  }, assetForm.parentAssetId ? "New asset version saved" : "Asset saved to the library");

  const selectTab = (next) => { setTab(next); const type = next === "Characters" ? "character" : next === "Locations" ? "location" : next === "Voices" ? "voice" : "image"; setAssetForm((form) => ({ ...form, assetType: type, parentAssetId: "" })); };
  const clearRecovery = () => { localStorage.removeItem(DRAFT_KEY); setProjectForm(EMPTY_PROJECT); setEpisodeForm(EMPTY_EPISODE); setSceneForm(EMPTY_SCENE); setAssetForm(EMPTY_ASSET); setStatus("Recovered draft cleared"); };

  return <div className="project-library-page">
    <header className="library-hero">
      <div><span className="library-eyebrow">Aigenikz Creator Memory</span><h1>Project Library</h1><p>Keep every world, episode, character, voice, and production asset ready for the next scene.</p></div>
      <button className="library-primary" onClick={() => setShowNewProject(true)}>+ New Project</button>
    </header>
    <div className={`library-save-state ${status.toLowerCase().includes("failed") || status.toLowerCase().includes("error") ? "error" : ""}`}><span className="library-status-dot" />{status}<button onClick={clearRecovery}>Clear local draft</button></div>

    <div className="library-layout">
      <aside className="library-project-rail">
        <div className="library-rail-title"><strong>Projects</strong><span>{projects.length}</span></div>
        {projects.map((project) => <button key={project.id} className={project.id === activeId ? "active" : ""} onClick={() => { setActiveId(project.id); setShowNewProject(false); }}><span>{project.title.slice(0, 1).toUpperCase()}</span><div><strong>{project.title}</strong><small>{project.type}</small></div></button>)}
        {!projects.length && <p className="library-empty-copy">Create your first permanent creator project.</p>}
      </aside>

      <main className="library-workspace">
        {showNewProject && <section className="library-panel library-new-project"><div className="library-panel-heading"><div><span>New production</span><h2>Create a project</h2></div><button className="library-close" onClick={() => setShowNewProject(false)}>×</button></div><div className="library-form-grid"><label>Project name<input value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} placeholder="Hollow Bloom" /></label><label>Project type<select value={projectForm.type} onChange={(e) => setProjectForm({ ...projectForm, type: e.target.value })}><option value="video-series">Video series</option><option value="film">Film</option><option value="short-form">Short-form series</option><option value="audio-series">Audio series</option></select></label><label className="wide">Story summary<textarea value={projectForm.summary} onChange={(e) => setProjectForm({ ...projectForm, summary: e.target.value })} placeholder="Describe the world and central story…" /></label></div><button disabled={busy || !projectForm.title.trim()} className="library-primary" onClick={createProject}>Create permanent project</button></section>}

        {activeId && <>
          <nav className="library-tabs" aria-label="Project library sections">{TABS.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => selectTab(item)}>{item}</button>)}</nav>
          {tab === "Overview" && <section className="library-overview"><div className="library-project-banner"><span>Active production</span><h2>{projects.find((p) => p.id === activeId)?.title}</h2><p>{projects.find((p) => p.id === activeId)?.summary || "Add episodes, scenes, and reusable assets to build this production."}</p></div><div className="library-stat-grid"><div><strong>{library?.counts?.episodes || 0}</strong><span>Episodes</span></div><div><strong>{library?.counts?.scenes || 0}</strong><span>Scenes</span></div><div><strong>{library?.counts?.assets || 0}</strong><span>Assets</span></div><div><strong>{Math.max(0, ...(library?.assets || []).map((a) => a.version || 1))}</strong><span>Latest version</span></div></div><div className="library-panel"><h3>Continuity memory</h3><p>Assets stored here can be reused by the scene planner and video pipeline so characters, locations, voices, and visual references remain attached to this project.</p></div></section>}

          {tab === "Episodes & Scenes" && <div className="library-two-column"><section className="library-panel"><div className="library-panel-heading"><div><span>Story structure</span><h2>Episodes</h2></div><b>{library?.episodes?.length || 0}</b></div><div className="library-form-stack"><label>Episode title<input value={episodeForm.title} onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })} placeholder="The Last Day" /></label><label>Episode number<input type="number" min="1" value={episodeForm.episodeNumber} onChange={(e) => setEpisodeForm({ ...episodeForm, episodeNumber: Number(e.target.value) })} /></label><label>Synopsis<textarea value={episodeForm.synopsis} onChange={(e) => setEpisodeForm({ ...episodeForm, synopsis: e.target.value })} /></label><button className="library-primary" disabled={busy || !episodeForm.title.trim()} onClick={createEpisode}>Save episode</button></div><div className="library-records">{(library?.episodes || []).map((episode) => <article key={episode.id}><span>{episode.episode_number}</span><div><strong>{episode.title}</strong><small>{episode.synopsis || "Synopsis not added"}</small></div><em>{episode.status}</em></article>)}</div></section><section className="library-panel"><div className="library-panel-heading"><div><span>Shot planning</span><h2>Scenes</h2></div><b>{library?.scenes?.length || 0}</b></div><div className="library-form-stack"><label>Scene title<input value={sceneForm.title} onChange={(e) => setSceneForm({ ...sceneForm, title: e.target.value })} placeholder="The Hidden Garden" /></label><div className="library-inline"><label>Scene #<input type="number" min="1" value={sceneForm.sceneNumber} onChange={(e) => setSceneForm({ ...sceneForm, sceneNumber: Number(e.target.value) })} /></label><label>Seconds<input type="number" min="1" value={sceneForm.durationSeconds} onChange={(e) => setSceneForm({ ...sceneForm, durationSeconds: Number(e.target.value) })} /></label></div><label>Episode<select value={sceneForm.episodeId} onChange={(e) => setSceneForm({ ...sceneForm, episodeId: e.target.value })}><option value="">Unassigned</option>{(library?.episodes || []).map((episode) => <option key={episode.id} value={episode.id}>Episode {episode.episode_number}: {episode.title}</option>)}</select></label><label>Script<textarea value={sceneForm.script} onChange={(e) => setSceneForm({ ...sceneForm, script: e.target.value })} /></label><label>Visual direction<textarea value={sceneForm.visualPrompt} onChange={(e) => setSceneForm({ ...sceneForm, visualPrompt: e.target.value })} /></label><button className="library-primary" disabled={busy || !sceneForm.title.trim()} onClick={createScene}>Save scene</button></div><div className="library-records">{(library?.scenes || []).map((scene) => <article key={scene.id}><span>{scene.scene_number}</span><div><strong>{scene.title}</strong><small>{scene.duration_seconds}s · {scene.production_method || "method selected during production"}</small></div><em>{scene.status}</em></article>)}</div></section></div>}

          {["Characters", "Locations", "Voices", "Images & Video"].includes(tab) && <div className="library-assets-layout"><section className="library-panel"><div className="library-panel-heading"><div><span>Reusable production memory</span><h2>Add {tab === "Images & Video" ? "media" : tab.toLowerCase()}</h2></div></div><div className="library-form-stack"><label>Name<input value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder={tab === "Characters" ? "Kyle" : tab === "Locations" ? "Glowing cave pond" : tab === "Voices" ? "Kyle — warm tenor" : "Graduation courtyard reference"} /></label>{tab === "Images & Video" && <label>Media type<select value={assetForm.assetType} onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value, mimeType: e.target.value === "video" ? "video/mp4" : "image/png" })}><option value="image">Image</option><option value="video">Video clip</option></select></label>}<label>Asset URL<input value={assetForm.storageUri} onChange={(e) => setAssetForm({ ...assetForm, storageUri: e.target.value })} placeholder="https://…" /></label><label>Create new version of<select value={assetForm.parentAssetId} onChange={(e) => setAssetForm({ ...assetForm, parentAssetId: e.target.value })}><option value="">New master asset</option>{visibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · v{asset.version}</option>)}</select></label><label>Continuity notes<textarea value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} placeholder="Appearance, wardrobe, voice, behavior, camera or continuity details…" /></label><label className="library-check"><input type="checkbox" checked={assetForm.reusable} onChange={(e) => setAssetForm({ ...assetForm, reusable: e.target.checked })} />Reusable across scenes and episodes</label><button className="library-primary" disabled={busy || !assetForm.name.trim()} onClick={createAsset}>{assetForm.parentAssetId ? "Save new version" : "Add to library"}</button></div></section><section><div className="library-asset-header"><div><h2>{tab}</h2><p>{visibleAssets.length} saved assets</p></div></div><div className="library-asset-grid">{visibleAssets.map((asset) => <article key={asset.id} className="library-asset-card"><div className="library-asset-preview"><AssetPreview asset={asset} /><span>v{asset.version}</span></div><div><strong>{asset.name}</strong><small>{asset.assetType} · {asset.source}</small><p>{asset.metadata?.notes || "No continuity notes yet."}</p>{asset.parentAssetId && <em>Versioned from an earlier asset</em>}</div></article>)}{!visibleAssets.length && <div className="library-empty-state"><span>＋</span><h3>No {tab.toLowerCase()} saved yet</h3><p>Add the first reference to begin this project’s continuity memory.</p></div>}</div></section></div>}
        </>}
        {!activeId && !showNewProject && <div className="library-empty-state"><h2>Select or create a project</h2></div>}
      </main>
    </div>
  </div>;
}
