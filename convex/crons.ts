import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every hour: escalate overdue tasks
crons.interval(
  "escalate overdue tasks",
  { hours: 1 },
  internal.cronHandlers.escalateOverdueTasks,
);

// Every day at midnight UTC: detect stale tasks
crons.daily(
  "detect stale tasks",
  { hourUTC: 0, minuteUTC: 0 },
  internal.cronHandlers.detectStaleTasks,
);

// Every day at 8am UTC: handoff reminders
crons.daily(
  "daily handoff reminder",
  { hourUTC: 8, minuteUTC: 0 },
  internal.cronHandlers.sendHandoffReminders,
);

export default crons;
