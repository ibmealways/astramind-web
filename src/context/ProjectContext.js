import React, { createContext, useContext, useMemo, useState } from "react";
import { loadProjects, saveProjects } from "../core/content/contentProjectStore.js";

const ProjectContext = createContext(null);

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

  const persistProjects = (nextProjects) => {
    try {
      saveProjects(nextProjects);
      localStorage.setItem(
        "astramind_content_lab_projects",
        JSON.stringify(nextProjects)
      );
    } catch (err) {
      console.error("Failed to save projects:", err);
    }
  };

  const addProject = (project) => {
    setProjects((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev : [];
      const withoutDuplicate = cleanPrev.filter((p) => p.id !== project.id);
      const nextProjects = [project, ...withoutDuplicate];

      persistProjects(nextProjects);

      return nextProjects;
    });
  };

  const updateProject = (updated) => {
    setProjects((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev : [];
      const nextProjects = cleanPrev.map((p) =>
        p.id === updated.id ? updated : p
      );

      persistProjects(nextProjects);

      return nextProjects;
    });
  };

  const removeProject = (projectId) => {
    setProjects((prev) => {
      const cleanPrev = Array.isArray(prev) ? prev : [];
      const nextProjects = cleanPrev.filter((p) => p.id !== projectId);

      persistProjects(nextProjects);

      return nextProjects;
    });
  };

  const clearProjects = () => {
    setProjects([]);
    persistProjects([]);
  };

  const value = useMemo(
    () => ({
      projects,
      addProject,
      updateProject,
      removeProject,
      clearProjects,
    }),
    [projects]
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
