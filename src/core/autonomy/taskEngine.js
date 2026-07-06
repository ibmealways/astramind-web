let TASKS = [];

export function createTask({ title, agent, action }) {
  const task = {
    id: crypto.randomUUID(),
    title,
    agent,
    action,
    status: "pending",
    createdAt: Date.now(),
  };

  TASKS.push(task);
  return task;
}

export function runTask(task) {
  task.status = "running";

  try {
    const result = task.action();
    task.status = "completed";
    task.result = result;
  } catch (e) {
    task.status = "failed";
    task.error = e.message;
  }

  return task;
}

export function getTasks() {
  return TASKS;
}
