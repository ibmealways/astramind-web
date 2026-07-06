import { useScheduler } from "../context/SchedulerContext.js";

export default function SchedulerPanel() {
  const { scheduleTask } = useScheduler();

  return (
    <button
      onClick={() =>
        scheduleTask(
          { action: () => console.log("Background task running") },
          60000
        )
      }
    >
      Schedule Hourly Task
    </button>
  );
}
