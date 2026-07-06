import { createContext, useContext } from "react";
import { scheduleTask } from "../core/autonomy/scheduler.js";

const SchedulerContext = createContext();

export function SchedulerProvider({ children }) {
  return (
    <SchedulerContext.Provider value={{ scheduleTask }}>
      {children}
    </SchedulerContext.Provider>
  );
}

export const useScheduler = () => useContext(SchedulerContext);
