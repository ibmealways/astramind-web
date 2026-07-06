let SCHEDULED = [];

export function scheduleTask(task, intervalMs) {
  const id = setInterval(() => {
    task.action();
  }, intervalMs);

  SCHEDULED.push({ task, id });
}

export function stopAllSchedules() {
  SCHEDULED.forEach(s => clearInterval(s.id));
  SCHEDULED = [];
}
