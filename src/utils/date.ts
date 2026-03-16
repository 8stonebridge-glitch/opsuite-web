function formatLocalDateParts(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return formatLocalDateParts(new Date());
}

export function getNowISO(): string {
  return new Date().toISOString();
}

export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  if (status === 'Verified' || status === 'Submitted') return false;
  return dueDate < getToday();
}

export function formatDue(date: string | null): string | null {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Returns "D Mon YYYY" (e.g. "9 Mar 2026") — alias for formatDue for non-due-date contexts. */
export function formatHumanDate(date: string | null): string | null {
  return formatDue(date);
}

export function diffDays(a: string, b: string): number {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000
  );
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format an ISO datetime string to "D Mon YYYY, HH:mm" (e.g. "10 Mar 2026, 10:00") */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

export function dueLabel(dueDate: string | null, status: string): { text: string; urgent: boolean } | null {
  if (!dueDate) return null;
  if (status === 'Verified' || status === 'Submitted') return { text: formatDue(dueDate) || dueDate, urgent: false };
  const days = diffDays(getToday(), dueDate);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: false };
  if (days <= 7) return { text: `${days}d left`, urgent: false };
  return { text: formatDue(dueDate) || dueDate, urgent: false };
}
