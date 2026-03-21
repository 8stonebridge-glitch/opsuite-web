import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { requireAuthContext, ConvexActionError } from "@/lib/server/convexActions";
import { api } from "@/lib/convexApi";

// ── CSV helpers ─────────────────────────────────────────────────────

function escapeCsvField(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(",");
}

// ── Task CSV ────────────────────────────────────────────────────────

function buildTaskCsv(
  tasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    startedAt?: string;
    completedAt?: string;
    verifiedAt?: string;
    isReworked: boolean;
    reworkCount: number;
    createdAt: string;
    updatedAt: string;
  }>,
): string {
  const headers = [
    "ID",
    "Title",
    "Status",
    "Priority",
    "Due Date",
    "Started At",
    "Completed At",
    "Verified At",
    "Is Reworked",
    "Rework Count",
    "Created At",
    "Updated At",
  ];

  const rows = tasks.map((t) =>
    toCsvRow([
      t._id,
      t.title,
      t.status,
      t.priority,
      t.dueDate ?? "",
      t.startedAt ?? "",
      t.completedAt ?? "",
      t.verifiedAt ?? "",
      t.isReworked ? "Yes" : "No",
      t.reworkCount,
      t.createdAt,
      t.updatedAt,
    ]),
  );

  return [toCsvRow(headers), ...rows].join("\n");
}

// ── Audit CSV ───────────────────────────────────────────────────────

function buildAuditCsv(
  audits: Array<{
    _id: string;
    taskId: string;
    type: string;
    message: string;
    createdAt: string;
    actorMembershipId?: string;
  }>,
): string {
  const headers = [
    "ID",
    "Task ID",
    "Type",
    "Message",
    "Actor Membership ID",
    "Created At",
  ];

  const rows = audits.map((a) =>
    toCsvRow([
      a._id,
      a.taskId,
      a.type,
      a.message,
      a.actorMembershipId ?? "",
      a.createdAt,
    ]),
  );

  return [toCsvRow(headers), ...rows].join("\n");
}

// ── GET handler ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { token, active } = await requireAuthContext();

    // Only owner_admin can export data
    if (active.membership.role !== "owner_admin") {
      return NextResponse.json(
        { error: "Only the organization owner can export data." },
        { status: 403 },
      );
    }

    const type = request.nextUrl.searchParams.get("type");

    if (type === "tasks") {
      const taskList = await fetchQuery(
        api.tasks.listForCurrentScope,
        {},
        { token },
      );

      // taskList is the TaskListResult shape — extract the tasks array
      const tasks = Array.isArray(taskList)
        ? taskList
        : (taskList as { tasks?: unknown[] })?.tasks ?? [];

      const csv = buildTaskCsv(tasks as Parameters<typeof buildTaskCsv>[0]);
      const timestamp = new Date().toISOString().split("T")[0];

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="tasks-export-${timestamp}.csv"`,
        },
      });
    }

    if (type === "audit") {
      const audits = await fetchQuery(
        api.taskAudits.listForOrganization,
        {},
        { token },
      );

      const csv = buildAuditCsv(
        (audits ?? []) as Parameters<typeof buildAuditCsv>[0],
      );
      const timestamp = new Date().toISOString().split("T")[0];

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-export-${timestamp}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid export type. Use ?type=tasks or ?type=audit' },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof ConvexActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
