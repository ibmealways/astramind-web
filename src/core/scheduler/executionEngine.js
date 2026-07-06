import { getJobs, updateJob, removeJob } from "./jobStore.js";
import { publishContent } from "../content/publisherEngine.js";

export function startExecutionEngine() {
  console.log("⚙️ Execution Engine Running...");

  setInterval(async () => {
    const now = new Date();

    const jobs = getJobs();

    for (const job of jobs) {
      // RUN SCHEDULED JOB
      if (
        job.status === "scheduled" &&
        new Date(job.runAt) <= now
      ) {
        console.log("🚀 Running scheduled job:", job.id);

        updateJob(job.id, { status: "running" });

        try {
          await publishContent(job.payload);

          updateJob(job.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });

        } catch (err) {
          console.error("🔥 Job failed:", err);

          updateJob(job.id, {
            status: "failed",
            error: err.message,
          });
        }
      }

      // INSTANT JOBS
      if (job.status === "queued") {
        console.log("⚡ Running instant job:", job.id);

        updateJob(job.id, { status: "running" });

        try {
          await publishContent(job.payload);

          updateJob(job.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });

        } catch (err) {
          updateJob(job.id, {
            status: "failed",
            error: err.message,
          });
        }
      }
    }
  }, 4000);
}