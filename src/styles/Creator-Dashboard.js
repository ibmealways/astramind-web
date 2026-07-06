import React, { useEffect, useState } from "react";
import "../styles/creator-dashboard.css";
import {
  getCreatorDashboard,
  updateCreatorProfile,
  createCreatorProject,
  createCreatorMemory,
  deleteCreatorProject,
  deleteCreatorMemory,
} from "../core/brain/creatorBrain.js";

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function CreatorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    primaryIdentity: "",
    mission: "",
    writingTone: "",
    preferredPlatforms: "",
    businesses: "",
    activeGoals: "",
  });

  const [projectForm, setProjectForm] = useState({
    title: "",
    type: "",
    summary: "",
  });

  const [memoryForm, setMemoryForm] = useState({
    category: "strategy",
    title: "",
    content: "",
    tags: "",
    linkedProjectId: "",
    importance: 3,
  });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await getCreatorDashboard();
      setDashboard(data.dashboard || null);

      const profile = data.dashboard?.profile || {};
      setProfileForm({
        displayName: profile.displayName || "",
        primaryIdentity: profile.primaryIdentity || "",
        mission: profile.mission || "",
        writingTone: profile.writingTone || "",
        preferredPlatforms: (profile.preferredPlatforms || []).join(", "),
        businesses: (profile.businesses || []).join(", "),
        activeGoals: (profile.activeGoals || []).join(", "),
      });
    } catch (error) {
      console.error(error);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSaveProfile = async () => {
    try {
      await updateCreatorProfile({
        displayName: profileForm.displayName,
        primaryIdentity: profileForm.primaryIdentity,
        mission: profileForm.mission,
        writingTone: profileForm.writingTone,
        preferredPlatforms: profileForm.preferredPlatforms
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        businesses: profileForm.businesses
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        activeGoals: profileForm.activeGoals
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        preferences: {},
      });

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Unable to save creator profile.");
    }
  };

  const handleCreateProject = async () => {
    if (!projectForm.title.trim()) return;

    try {
      await createCreatorProject({
        id: makeId("proj"),
        title: projectForm.title,
        type: projectForm.type,
        status: "active",
        summary: projectForm.summary,
        metadata: {},
      });

      setProjectForm({
        title: "",
        type: "",
        summary: "",
      });

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Unable to create project.");
    }
  };

  const handleCreateMemory = async () => {
    if (!memoryForm.content.trim()) return;

    try {
      await createCreatorMemory({
        id: makeId("mem"),
        category: memoryForm.category,
        title: memoryForm.title,
        content: memoryForm.content,
        tags: memoryForm.tags
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        linkedProjectId: memoryForm.linkedProjectId,
        importance: Number(memoryForm.importance) || 3,
      });

      setMemoryForm((prev) => ({
        ...prev,
        title: "",
        content: "",
        tags: "",
      }));

      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Unable to save memory.");
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await deleteCreatorProject(id);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Unable to delete project.");
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await deleteCreatorMemory(id);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      alert("Unable to delete memory.");
    }
  };

  if (loading) {
    return (
      <div className="creator-dashboard-page os-panel os-page-enter os-breathe text-white">
        <div className="creator-dashboard-loading">Loading Creator Brain...</div>
      </div>
    );
  }

  return (
    <div className="creator-dashboard-page os-panel os-page-enter os-breathe text-white">
      <div className="creator-dashboard-header">
        <h1>🧠 Creator Dashboard</h1>
        <p>
          Persistent profile, active projects, memory intelligence, and suggested next moves.
        </p>
      </div>

      <div className="creator-dashboard-grid">
        <section className="creator-card">
          <h2>Creator Brain Profile</h2>

          <input
            className="creator-input"
            value={profileForm.displayName}
            onChange={(e) =>
              setProfileForm((prev) => ({ ...prev, displayName: e.target.value }))
            }
            placeholder="Display name"
          />

          <input
            className="creator-input"
            value={profileForm.primaryIdentity}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                primaryIdentity: e.target.value,
              }))
            }
            placeholder="Primary identity"
          />

          <textarea
            className="creator-textarea"
            value={profileForm.mission}
            onChange={(e) =>
              setProfileForm((prev) => ({ ...prev, mission: e.target.value }))
            }
            placeholder="Mission"
          />

          <input
            className="creator-input"
            value={profileForm.writingTone}
            onChange={(e) =>
              setProfileForm((prev) => ({ ...prev, writingTone: e.target.value }))
            }
            placeholder="Writing tone"
          />

          <input
            className="creator-input"
            value={profileForm.preferredPlatforms}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                preferredPlatforms: e.target.value,
              }))
            }
            placeholder="Preferred platforms (comma separated)"
          />

          <input
            className="creator-input"
            value={profileForm.businesses}
            onChange={(e) =>
              setProfileForm((prev) => ({ ...prev, businesses: e.target.value }))
            }
            placeholder="Businesses (comma separated)"
          />

          <input
            className="creator-input"
            value={profileForm.activeGoals}
            onChange={(e) =>
              setProfileForm((prev) => ({ ...prev, activeGoals: e.target.value }))
            }
            placeholder="Active goals (comma separated)"
          />

          <button className="creator-btn primary" onClick={handleSaveProfile}>
            Save Creator Brain
          </button>
        </section>

        <section className="creator-card">
          <h2>Create Project</h2>

          <input
            className="creator-input"
            value={projectForm.title}
            onChange={(e) =>
              setProjectForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Project title"
          />

          <input
            className="creator-input"
            value={projectForm.type}
            onChange={(e) =>
              setProjectForm((prev) => ({ ...prev, type: e.target.value }))
            }
            placeholder="Project type"
          />

          <textarea
            className="creator-textarea"
            value={projectForm.summary}
            onChange={(e) =>
              setProjectForm((prev) => ({ ...prev, summary: e.target.value }))
            }
            placeholder="Project summary"
          />

          <button className="creator-btn primary" onClick={handleCreateProject}>
            Add Project
          </button>

          <h3 className="creator-subtitle">Active Projects</h3>

          <div className="creator-list">
            {(dashboard?.activeProjects || []).map((project) => (
              <div key={project.id} className="creator-list-item">
                <div>
                  <div className="creator-list-title">{project.title}</div>
                  <div className="creator-list-meta">
                    {project.type || "general"} • {project.status}
                  </div>
                  <div className="creator-list-text">{project.summary}</div>
                </div>
                <button
                  className="creator-btn danger small"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="creator-card">
          <h2>Save Memory</h2>

          <select
            className="creator-input"
            value={memoryForm.category}
            onChange={(e) =>
              setMemoryForm((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            <option value="strategy">Strategy</option>
            <option value="business">Business</option>
            <option value="content">Content</option>
            <option value="book">Book</option>
            <option value="research">Research</option>
            <option value="personal">Personal</option>
          </select>

          <input
            className="creator-input"
            value={memoryForm.title}
            onChange={(e) =>
              setMemoryForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Memory title"
          />

          <textarea
            className="creator-textarea"
            value={memoryForm.content}
            onChange={(e) =>
              setMemoryForm((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Memory content"
          />

          <input
            className="creator-input"
            value={memoryForm.tags}
            onChange={(e) =>
              setMemoryForm((prev) => ({ ...prev, tags: e.target.value }))
            }
            placeholder="Tags (comma separated)"
          />

          <select
            className="creator-input"
            value={memoryForm.linkedProjectId}
            onChange={(e) =>
              setMemoryForm((prev) => ({
                ...prev,
                linkedProjectId: e.target.value,
              }))
            }
          >
            <option value="">No linked project</option>
            {(dashboard?.activeProjects || []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>

          <input
            className="creator-input"
            type="number"
            min="1"
            max="5"
            value={memoryForm.importance}
            onChange={(e) =>
              setMemoryForm((prev) => ({
                ...prev,
                importance: Number(e.target.value),
              }))
            }
            placeholder="Importance"
          />

          <button className="creator-btn primary" onClick={handleCreateMemory}>
            Save Memory Entry
          </button>
        </section>

        <section className="creator-card">
          <h2>Recent Memory</h2>

          <div className="creator-list">
            {(dashboard?.recentMemory || []).map((entry) => (
              <div key={entry.id} className="creator-list-item">
                <div>
                  <div className="creator-list-title">
                    {entry.title || entry.category}
                  </div>
                  <div className="creator-list-meta">
                    {entry.category} • importance {entry.importance}
                  </div>
                  <div className="creator-list-text">{entry.content}</div>
                </div>
                <button
                  className="creator-btn danger small"
                  onClick={() => handleDeleteMemory(entry.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="creator-card creator-card-wide">
          <h2>Suggested Next Moves</h2>
          <div className="creator-suggestions">
            {(dashboard?.suggestions || []).map((item, index) => (
              <div key={index} className="creator-suggestion">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}