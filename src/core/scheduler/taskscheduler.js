export function scheduleTask({ name, payload, runAt }) {
  const tasks = JSON.parse(
    localStorage.getItem("astramind_tasks") || "[]"
  );

  tasks.push({
    id: Date.now(),
    name,
    payload,
    runAt,
    status: "scheduled",
  });

  localStorage.setItem("astramind_tasks", JSON.stringify(tasks));
}
