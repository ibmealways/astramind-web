import { useTasks } from "../context/TaskContext.js";

export default function TaskDashboard() {
  const { tasks, executeTask } = useTasks();

  return (
    <div className="task-dashboard">
      <h2>🧠 Autonomous Tasks</h2>
      {tasks.map(task => (
        <div key={task.id}>
          <strong>{task.title}</strong> — {task.status}
          {task.status === "pending" && (
            <button onClick={() => executeTask(task)}>Run</button>
          )}
        </div>
      ))}
    </div>
  );
}
