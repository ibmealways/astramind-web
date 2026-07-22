let jobs = [];

export function addJob(job) {
  const newJob = {
    id: job.id || Date.now(),
    payload: job,
    status: "queued",
    runAt: job.runAt || null,
    createdAt: Date.now(),
  };
  
  jobs.push(job);
  return job;
}

export function getJobs(userId = null) {
  return userId ? jobs.filter((job)=>job.userId===userId) : jobs;
}

export function updateJob(id, updates) {
  jobs = jobs.map(j =>
    j.id === id ? { ...j, ...updates } : j
  );
}

export function removeJob(id) {
  jobs = jobs.filter(j => j.id !== id);
}
