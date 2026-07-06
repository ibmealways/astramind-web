let lastContentProject = null;
export function saveContentProject(project) {
  lastContentProject = { 
    ...project,
    createdAt: new Date().toISOString(),
  };
 
  console.log("💾 Saved Content Project");
}

export function getLastContentProject() {
  return lastContentProject;
}  