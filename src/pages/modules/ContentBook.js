import React, { useEffect, useState } from "react";
import "../../styles/content-book.css";
import {
  createBookProject,
  fetchBookProjects,
  fetchBookProject,
  draftBookChapter,
  deleteBookProject,
} from "../../core/intelligence/hybridAI.js";

export default function ContentBook() {
  const [topic, setTopic] = useState("");
  const [genre, setGenre] = useState("Fiction");
  const [tone, setTone] = useState("Bold");
  const [audience, setAudience] = useState("General readers");
  const [chapterCount, setChapterCount] = useState(10);
  const [includeResearch, setIncludeResearch] = useState(true);

  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeProject, setActiveProject] = useState(null);

  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterPurpose, setChapterPurpose] = useState("");

  const [output, setOutput] = useState("");

  const loadProjects = async () => {
    try {
      const data = await fetchBookProjects({});
      setProjects(data.projects || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadProjectById = async (id) => {
    if (!id) return;

    try {
      const data = await fetchBookProject({ id });
      setActiveProject(data.project || null);

      const nextChapter = (data.project?.chapters?.length || 0) + 1;
      setChapterNumber(nextChapter);

      const plan = data.project?.storyBible?.chapterPlan?.find(
        (p) => Number(p.chapterNumber) === nextChapter
      );

      setChapterTitle(plan?.chapterTitle || `Chapter ${nextChapter}`);
      setChapterPurpose(plan?.purpose || plan?.mainConflict || "");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // ============================
  // 🔥 CHAT → BOOK WRITER HANDOFF
  // ============================
  useEffect(() => {
    try {
      const saved = localStorage.getItem("astramind_handoff");
      if (!saved) return;

      const handoff = JSON.parse(saved);

      const isBookHandoff =
        handoff.route === "Book Writer" ||
        handoff.path === "/content/book" ||
        String(handoff.outputMode || "").toUpperCase() === "GENERATOR";

      if (!isBookHandoff) return;

      setTopic(handoff.prompt || "");
      setOutput(handoff.reply || "");

      localStorage.setItem(
        "astramind_book_project_seed",
        JSON.stringify({
          topic: handoff.prompt || "",
          outline: handoff.reply || "",
          route: handoff.route || "Book Writer",
          createdAt: handoff.createdAt || new Date().toISOString(),
          source: "chat_handoff",
        })
      );

      localStorage.removeItem("astramind_handoff");
    } catch (err) {
      console.error("Book handoff load failed:", err);
      localStorage.removeItem("astramind_handoff");
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectById(activeProjectId);
    }
  }, [activeProjectId]);

  const handleCreateProject = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setOutput("");

    try {
      const data = await createBookProject({
        topic,
        genre,
        tone,
        audience,
        chapterCount,
        includeResearch,
      });

      const project = data.project;
      setActiveProject(project);
      setActiveProjectId(project.id);
      setOutput(project.outline || "");
      await loadProjects();

      const nextChapter = 1;
      setChapterNumber(nextChapter);

      const plan = project?.storyBible?.chapterPlan?.find(
        (p) => Number(p.chapterNumber) === nextChapter
      );

      setChapterTitle(plan?.chapterTitle || `Chapter ${nextChapter}`);
      setChapterPurpose(plan?.purpose || plan?.mainConflict || "");
    } catch (error) {
      console.error(error);
      setOutput("Unable to create book project right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleDraftChapter = async () => {
    if (!activeProjectId) return;

    setDrafting(true);
    setOutput("");

    try {
      const data = await draftBookChapter({
        id: activeProjectId,
        chapterNumber,
        chapterTitle,
        chapterPurpose,
      });

      setActiveProject(data.project || null);
      setOutput(data.chapter?.content || "");

      const nextChapter = Number(chapterNumber) + 1;
      setChapterNumber(nextChapter);

      const plan = data.project?.storyBible?.chapterPlan?.find(
        (p) => Number(p.chapterNumber) === nextChapter
      );

      setChapterTitle(plan?.chapterTitle || `Chapter ${nextChapter}`);
      setChapterPurpose(plan?.purpose || plan?.mainConflict || "");

      await loadProjects();
    } catch (error) {
      console.error(error);
      setOutput("Unable to draft chapter right now.");
    } finally {
      setDrafting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProjectId) return;

    const ok = window.confirm("Delete this book project?");
    if (!ok) return;

    try {
      await deleteBookProject({ id: activeProjectId });
      setActiveProjectId("");
      setActiveProject(null);
      setOutput("");
      await loadProjects();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="content-book-page os-panel os-page-enter os-breathe text-white">
      <div className="content-book-header">
        <h1>📚 Book Writer OS</h1>
        <p>
          Create a full book project, generate a continuity-safe story bible,
          and draft chapters with memory.
        </p>
      </div>

      <div className="content-book-layout">
        <div className="content-book-sidebar">
          <div className="content-book-card">
            <h3>Create New Book Project</h3>

            <input
              className="content-book-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your book topic..."
            />

            <div className="content-book-grid">
              <select
                className="content-book-select"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                <option>Fiction</option>
                <option>Thriller</option>
                <option>Sci-Fi</option>
                <option>Drama</option>
                <option>Self-Help</option>
                <option>Business</option>
                <option>Memoir</option>
              </select>

              <select
                className="content-book-select"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option>Bold</option>
                <option>Dark</option>
                <option>Inspirational</option>
                <option>Cinematic</option>
                <option>Suspenseful</option>
                <option>Educational</option>
              </select>

              <input
                className="content-book-input"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Target audience"
              />

              <input
                className="content-book-input"
                type="number"
                min="3"
                max="30"
                value={chapterCount}
                onChange={(e) => setChapterCount(Number(e.target.value))}
                placeholder="Chapters"
              />
            </div>

            <label className="content-book-checkbox">
              <input
                type="checkbox"
                checked={includeResearch}
                onChange={(e) => setIncludeResearch(e.target.checked)}
              />
              Include live research
            </label>

            <button
              className="content-book-generate-btn"
              onClick={handleCreateProject}
              disabled={loading}
            >
              {loading ? "Building Project..." : "Create Book Project"}
            </button>
          </div>

          <div className="content-book-card">
            <h3>Saved Projects</h3>

            <select
              className="content-book-select"
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title || project.topic}
                </option>
              ))}
            </select>

            {activeProject ? (
              <div className="content-book-project-meta">
                <div>
                  <strong>Title:</strong> {activeProject.title}
                </div>
                <div>
                  <strong>Genre:</strong> {activeProject.genre}
                </div>
                <div>
                  <strong>Tone:</strong> {activeProject.tone}
                </div>
                <div>
                  <strong>Chapters Drafted:</strong>{" "}
                  {activeProject.chapters?.length || 0}
                </div>

                <button
                  className="content-book-delete-btn"
                  onClick={handleDeleteProject}
                >
                  Delete Project
                </button>
              </div>
            ) : null}
          </div>

          {activeProject ? (
            <div className="content-book-card">
              <h3>Chapter Draft Engine</h3>

              <input
                className="content-book-input"
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(Number(e.target.value))}
                placeholder="Chapter Number"
              />

              <input
                className="content-book-input"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="Chapter Title"
              />

              <textarea
                className="content-book-textarea"
                value={chapterPurpose}
                onChange={(e) => setChapterPurpose(e.target.value)}
                placeholder="Chapter purpose / conflict / target beat..."
              />

              <button
                className="content-book-generate-btn"
                onClick={handleDraftChapter}
                disabled={drafting}
              >
                {drafting ? "Drafting Chapter..." : "Draft Next Chapter"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="content-book-main">
          <div className="content-book-card">
            <h3>Project Output</h3>

            {output ? (
              <pre className="content-book-pre">{output}</pre>
            ) : (
              <div className="content-book-placeholder">
                Story bible, outline, or chapter draft will appear here.
              </div>
            )}
          </div>

          {activeProject?.storyBible ? (
            <div className="content-book-card">
              <h3>Continuity Memory / Story Bible</h3>
              <pre className="content-book-pre">
                {JSON.stringify(activeProject.storyBible, null, 2)}
              </pre>
            </div>
          ) : null}

          {activeProject?.chapters?.length ? (
            <div className="content-book-card">
              <h3>Drafted Chapters</h3>

              <div className="content-book-chapter-list">
                {activeProject.chapters.map((chapter) => (
                  <div
                    key={chapter.chapterNumber}
                    className="content-book-chapter-item"
                  >
                    <div className="content-book-chapter-title">
                      Chapter {chapter.chapterNumber}: {chapter.title}
                    </div>
                    <div className="content-book-chapter-summary">
                      {chapter.summary || "No summary."}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
