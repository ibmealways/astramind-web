import { createContext, useContext, useState } from "react";
import { createTask, runTask, getTasks } from "../core/autonomy/taskEngine.js";

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState(getTasks());

  const addTask = (task) => {
    const newTask = createTask(task);
    setTasks([...getTasks()]);
    return newTask;
  };

  const executeTask = (task) => {
    runTask(task);
    setTasks([...getTasks()]);
  };

  return (
    <TaskContext.Provider value={{ tasks, addTask, executeTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export const useTasks = () => useContext(TaskContext);
