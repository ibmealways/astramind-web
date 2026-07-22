import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { loadProjects, saveProjects } from "../core/content/contentProjectStore.js";

const ProjectContext = createContext(null);

function persistProjects(nextProjects) {
  try {
    saveProjects(nextProjects);
    localStorage.setItem(
      "astramind_content_lab_projects",
      JSON.stringify(nextProjects)
    );
  } catch (err) {
    console.error("Failed to save projects:", err);
  }
}

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState(() => {
    try {
      const loaded = loadProjects();
      return Array.isArray(loaded) ? loaded : [];
    } catch (err) {
      console.error("Failed to load projects:", err);
      return [];
    }
  });

  const addProject = useCallback((project) => {
    setProjects((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev : [];
      const withoutDuplicate = cleanPrev.filter((p) => p.id !== project.id);
      const nextProjects = [project, ...withoutDuplicate];

      persistProjects(nextProjects);

      return nextProjects;
    });
  }, []);

  const updateProject = useCallback((updated) => {
    setProjects((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev : [];
      const nextProjects = cleanPrev.map((p) =>
        p.id === updated.id ? updated : p
      );

      persistProjects(nextProjects);

      return nextProjects;
    });
  }, []);

  const removeProject = useCallback((projectId) => {
    setProjects((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev : [];
      const nextProjects = cleanPrev.filter((p) => p.id !== projectId);

      persistProjects(nextProjects);

      return nextProjects;
    });
  }, []);

  const clearProjects = useCallback(() => {
    setProjects([]);
    persistProjects([]);
  }, []);

  const value = useMemo(
    () => ({
      projects,
      addProject,
      updateProject,
      removeProject,
      clearProjects,
    }),
    [addProject, clearProjects, projects, removeProject, updateProject]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProjects must be used inside ProjectProvider");
  }

  return context;
}
