'use client';

import { useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/export?type=tasks');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const today = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opsuite-tasks-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently handle — the API may not be deployed yet
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-caption font-medium bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Export CSV
    </button>
  );
}
