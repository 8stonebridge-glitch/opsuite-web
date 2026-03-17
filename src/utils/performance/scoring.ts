import type { ScoreBand, EmployeePerformanceMetrics } from '../../types';

// ── Band thresholds ───────────────────────────────────────────────────

export function scoreToBand(score: number): ScoreBand {
  if (score >= 85) return 'green';
  if (score >= 70) return 'amber';
  return 'red';
}

// ── Date helpers ──────────────────────────────────────────────────────

export function offsetDate(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns weekdays (Mon-Fri) within [start, end] inclusive */
export function getWeekdaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  while (d <= endDate) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ── Score formula ─────────────────────────────────────────────────────

export function computeScore(metrics: EmployeePerformanceMetrics): number {
  const execution =
    ((1 - metrics.overdueRate) * 100 +
      metrics.onTimeCompletionRate * 100 +
      metrics.criticalResponseRate * 100 +
      Math.max(0, 100 - metrics.staleActiveCount * 15)) /
    4;

  const discipline =
    (metrics.checkInComplianceRate * 100 +
      metrics.updateConsistencyRate * 100 +
      (1 - metrics.reworkRate) * 100 +
      metrics.handoffResponseRate * 100) /
    4;

  return Math.round(execution * 0.5 + discipline * 0.5);
}
