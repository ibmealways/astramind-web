import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjects } from "../context/ProjectContext.js";
import { useSubscription } from "../context/SubscriptionContext.js";
import UpgradeModal from "../components/UpgradeModal.js";

import {
  buildExportPackage,
  copyToClipboard,
  downloadJsonFile,
  downloadTextFile,
} from "../core/content/exportEngine.js";

import { canAccess } from "../core/subscription/accessControl.js";

const STORAGE_KEY = "astramind_content_lab_projects";
const PLATFORMS = ["TikTok", "Instagram", "YouTube", "X", "Facebook"];

export default function ContentLab() {
  const params = useParams();
  const projectId = params.projectId || params.id;

  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tier } = useSubscription();

  const [notice, setNotice] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [jobs, setJobs] = useState([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [localProjects, setLocalProjects] = useState([]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/scheduler/jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Scheduler jobs fetch failed:", err);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      setLocalProjects(Array.isArray(saved) ? saved : []);
    } catch (err) {
      console.error("Content Lab local project load failed:", err);
      setLocalProjects([]);
    }
  }, [projectId]);

  const selected = useMemo(() => {
    if (!projectId) return null;

    const contextProject = projects.find((p) => p.id === projectId);
    if (contextProject) return contextProject;

    const localProject = localProjects.find((p) => p.id === projectId);
    if (localProject) return localProject;

    return null;
  }, [projects, localProjects, projectId]);

  const latest = useMemo(() => {
    if (!selected?.versions?.length) return null;
    return selected.versions[selected.versions.length - 1];
  }, [selected]);

  const pack = latest?.platformPack;

  useEffect(() => {
    if (selected?.metadata?.selectedPlatforms?.length) {
      setSelectedPlatforms(selected.metadata.selectedPlatforms);
    }

    if (selected?.metadata?.scheduleTime) {
      setScheduleTime(selected.metadata.scheduleTime);
    }
  }, [selected]);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((x) => x !== platform)
        : [...prev, platform]
    );
  };

  const handlePublish = async () => {
    if (!canAccess("publish", tier)) {
      setShowUpgrade(true);
      return;
    }

    if (!latest || selectedPlatforms.length === 0) {
      setNotice("⚠️ Select at least one platform first.");
      return;
    }

    try {
      await fetch("http://localhost:5000/api/scheduler/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: latest.videoUrl || null,
          caption: latest.content,
          platforms: selectedPlatforms,
          runAt: null,
        }),
      });

      setNotice("🚀 Publishing job sent.");
      fetchJobs();
    } catch (err) {
      console.error("Publish failed:", err);
      setNotice("❌ Publishing failed.");
    }
  };

  const handleSchedule = async () => {
    if (!canAccess("schedule", tier)) {
      setShowUpgrade(true);
      setNotice("🔒 Upgrade to schedule posts.");
      return;
    }

    if (!scheduleTime || selectedPlatforms.length === 0) {
      setNotice("⚠️ Select schedule time and at least one platform.");
      return;
    }

    try {
      await fetch("http://localhost:5000/api/scheduler/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: latest?.videoUrl || null,
          caption: latest?.content || "",
          platforms: selectedPlatforms,
          runAt: scheduleTime,
        }),
      });

      setNotice("⏱ Scheduled successfully.");
      fetchJobs();
    } catch (err) {
      console.error("Schedule failed:", err);
      setNotice("❌ Scheduling failed.");
    }
  };

  const handleCopy = async () => {
    if (!latest?.content) {
      setNotice("⚠️ Nothing to copy.");
      return;
    }

    try {
      await copyToClipboard(latest.content);
      setNotice("✅ Copied to clipboard.");
    } catch (err) {
      console.error("Copy failed:", err);
      setNotice("❌ Copy failed.");
    }
  };

  const handleDownloadText = () => {
    if (!latest?.content) {
      setNotice("⚠️ Nothing to download.");
      return;
    }

    downloadTextFile(
      `${selected?.title || "astramind-content"}.txt`,
      latest.content
    );
    setNotice("✅ Text file downloaded.");
  };

  const handleDownloadJson = () => {
    if (!selected) {
      setNotice("⚠️ Project missing.");
      return;
    }

    const exportPack = buildExportPackage ? buildExportPackage(selected) : selected;

    downloadJsonFile(
      `${selected?.title || "astramind-content"}.json`,
      exportPack
    );
    setNotice("✅ JSON package downloaded.");
  };

  const sectionCard =
    "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.15)]";
  const subtleCard =
    "rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md";
  const primaryBtn =
    "px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95";
  const iconBtn =
    "px-4 py-2.5 rounded-xl font-semibold border transition-all duration-200 hover:scale-105 active:scale-95";
  const chipBase =
    "px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95";

  if (!selected) {
    return (
      <div className="min-h-screen p-6 text-white bg-gradient-to-br from-[#050816] via-[#090d1f] to-[#140b2d]">
        <div className="max-w-4xl mx-auto">
          <div className={`${sectionCard} p-8`}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-red-300">
              ❌ Project Not Found
            </div>

            <h1 className="text-3xl font-bold mb-3">Aigenikz couldn’t locate this project</h1>

            <p className="text-gray-300 mb-3">
              Project ID:
              <span className="ml-2 text-yellow-300 font-semibold">
                {projectId || "missing"}
              </span>
            </p>

            <p className="text-gray-400 mb-6">
              The project may not have been saved correctly, or the route was opened
              before storage finished syncing.
            </p>

            <button
              type="button"
              onClick={() => navigate("/content")}
              className={`${primaryBtn} bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_25px_rgba(147,51,234,0.35)]`}
            >
              ← Back to Content Creator
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-white bg-gradient-to-br from-[#050816] via-[#090d1f] to-[#140b2d]">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate("/content")}
            className={`${iconBtn} border-white/15 bg-white/5 hover:bg-white/10 text-white`}
          >
            ← Back to Content Creator
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-cyan-300 text-sm font-medium">
              🧪 Content Lab
            </span>

            <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-purple-300 text-sm font-medium">
              Tier: {tier || "free"}
            </span>
          </div>
        </div>

        {/* Hero */}
        <div className={`${sectionCard} p-6 md:p-8`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-extrabold tracking-tight mb-3">
                🚀 Content Lab
              </h1>

              <p className="text-gray-300 text-lg mb-5">
                Refine, package, publish, and export your Aigenikz content project.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Project</div>
                  <div className="text-sm md:text-base font-semibold text-white">
                    {selected.title}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Type</div>
                  <div className="text-sm md:text-base font-semibold text-cyan-300 capitalize">
                    {selected.type}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Project ID</div>
                  <div className="text-sm md:text-base font-semibold text-yellow-300">
                    {projectId}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Created</div>
                  <div className="text-sm md:text-base font-semibold text-white">
                    {selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString()
                      : "Unknown"}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${subtleCard} p-4 min-w-[250px]`}>
              <div className="text-sm text-gray-400 mb-2">Quick Actions</div>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`${primaryBtn} bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)]`}
                >
                  📋 Copy Content
                </button>

                <button
                  type="button"
                  onClick={handleDownloadText}
                  className={`${primaryBtn} bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)]`}
                >
                  ⬇️ Download TXT
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className={`${primaryBtn} bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_20px_rgba(147,51,234,0.25)]`}
                >
                  📦 Download JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Latest Content */}
          <div className={`xl:col-span-2 ${sectionCard} p-6`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold">📄 Latest Content</h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                Ready for export
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 max-h-[700px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-100 font-mono">
                {latest?.content || "No content found for this project."}
              </pre>
            </div>
          </div>

          {/* Right Rail */}
          <div className="space-y-6">
            {/* Publishing */}
            <div className={`${sectionCard} p-6`}>
              <h2 className="text-2xl font-bold mb-4">📡 Publishing Platforms</h2>

              <div className="flex flex-wrap gap-3 mb-5">
                {PLATFORMS.map((platform) => {
                  const active = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`${chipBase} ${
                        active
                          ? "bg-green-600/90 border-green-300 text-white shadow-[0_0_18px_rgba(34,197,94,0.35)]"
                          : "bg-white/5 border-white/10 text-gray-200 hover:bg-green-500/10 hover:border-green-400/50"
                      }`}
                    >
                      {active ? "✅ " : ""}
                      {platform}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Schedule time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handlePublish}
                    className={`${primaryBtn} bg-green-600 hover:bg-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]`}
                  >
                    🚀 Publish Now
                  </button>

                  <button
                    type="button"
                    onClick={handleSchedule}
                    className={`${primaryBtn} bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]`}
                  >
                    ⏱ Schedule Post
                  </button>
                </div>
              </div>
            </div>

            {/* Jobs */}
            <div className={`${sectionCard} p-6`}>
              <h2 className="text-2xl font-bold mb-4">📊 Jobs</h2>

              {jobs.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-gray-400">
                  No scheduler jobs found.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job, index) => (
                    <div
                      key={job.id || `${job.status}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Status</p>
                          <p className="font-semibold text-purple-300">
                            {job.status || "Unknown"}
                          </p>
                        </div>

                        {job.runAt && (
                          <div className="text-right">
                            <p className="text-sm text-gray-400 mb-1">Run At</p>
                            <p className="text-sm text-white">{job.runAt}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notice */}
            {notice && (
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.12)]">
                {notice}
              </div>
            )}
          </div>
        </div>

        {/* Optimization Pack */}
        {pack && (
          <div className={`${sectionCard} p-6`}>
            <h2 className="text-3xl font-bold mb-5">🚀 Optimization Pack</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {pack.tiktok && (
                <div className={`${subtleCard} p-5`}>
                  <div className="mb-2 text-pink-300 font-bold text-lg">🎵 TikTok</div>
                  <p className="text-sm text-gray-200 leading-6">
                    {pack.tiktok.caption}
                  </p>
                  {pack.tiktok.hashtags?.length ? (
                    <p className="text-xs text-gray-400 mt-3 leading-5">
                      {pack.tiktok.hashtags.join(" ")}
                    </p>
                  ) : null}
                </div>
              )}

              {pack.instagram && (
                <div className={`${subtleCard} p-5`}>
                  <div className="mb-2 text-purple-300 font-bold text-lg">
                    📸 Instagram
                  </div>
                  <p className="text-sm text-gray-200 leading-6">
                    {pack.instagram.caption}
                  </p>
                  {pack.instagram.hashtags?.length ? (
                    <p className="text-xs text-gray-400 mt-3 leading-5">
                      {pack.instagram.hashtags.join(" ")}
                    </p>
                  ) : null}
                </div>
              )}

              {pack.twitter && (
                <div className={`${subtleCard} p-5`}>
                  <div className="mb-2 text-cyan-300 font-bold text-lg">
                    🐦 X / Twitter
                  </div>
                  <p className="text-sm text-gray-200 leading-6">
                    {pack.twitter.caption}
                  </p>
                  {pack.twitter.hashtags?.length ? (
                    <p className="text-xs text-gray-400 mt-3 leading-5">
                      {pack.twitter.hashtags.join(" ")}
                    </p>
                  ) : null}
                </div>
              )}

              {pack.thumbnail && (
                <div className={`${subtleCard} p-5`}>
                  <div className="mb-2 text-yellow-300 font-bold text-lg">
                    🖼 Thumbnail
                  </div>
                  <p className="text-sm text-gray-200 leading-6">
                    {pack.thumbnail}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video Preview */}
        {latest?.videoUrl && (
          <div className={`${sectionCard} p-6`}>
            <h2 className="text-2xl font-bold mb-4">🎥 Video Preview</h2>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <video
                src={latest.videoUrl}
                controls
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}