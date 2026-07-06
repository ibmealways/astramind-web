import { getJobs, removeJob } from "./jobStore.js";
import { publishContent } from "../content/publisherEngine.js";

export function startScheduler() {
  console.log("⏱ Scheduler Engine Started");

  setInterval(async () => {
    const now = new Date();

    const jobs = getJobs();

    for (const job of jobs) {
      if (new Date(job.runAt) <= now) {
        console.log("🚀 Running scheduled job:", job.id);

        try {
          await publishContent(job.payload);
        } catch (err) {
          console.error("🔥 Job failed:", err);
        }

        removeJob(job.id);
      }
    }
  }, 5000); // checks every 5 seconds
}