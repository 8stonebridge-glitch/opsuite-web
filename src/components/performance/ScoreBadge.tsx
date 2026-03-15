'use client';

import type { ScoreBand } from '../../types';
import { useTheme } from '../../providers/ThemeProvider';

const BAND_COLORS: Record<ScoreBand, { ring: string; bg: string; bgDark: string; text: string }> = {
  green: { ring: '#059669', bg: '#ecfdf5', bgDark: '#052e16', text: '#059669' },
  amber: { ring: '#d97706', bg: '#fffbeb', bgDark: '#451a03', text: '#d97706' },
  red: { ring: '#dc2626', bg: '#fef2f2', bgDark: '#450a0a', text: '#dc2626' },
};

interface ScoreBadgeProps {
  score: number;
  band: ScoreBand;
  trendDelta?: number;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, band, trendDelta, size = 'sm' }: ScoreBadgeProps) {
  const { isDark } = useTheme();
  const colors = BAND_COLORS[band];
  const dim = size === 'sm' ? 32 : 48;
  const ringWidth = size === 'sm' ? 2.5 : 3;
  const fontSize = size === 'sm' ? 11 : 16;
  const trendSize = size === 'sm' ? 9 : 11;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size === 'sm' ? 2 : 4 }}>
      {/* Circular score ring */}
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          borderWidth: ringWidth,
          borderStyle: 'solid',
          borderColor: colors.ring,
          backgroundColor: isDark ? colors.bgDark : colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {score}
        </span>
      </div>

      {/* Trend arrow */}
      {trendDelta !== undefined && trendDelta !== 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span
            style={{
              fontSize: trendSize,
              color: trendDelta > 0 ? '#059669' : '#dc2626',
            }}
          >
            {trendDelta > 0 ? '\u2191' : '\u2193'}
          </span>
          <span
            style={{
              fontSize: trendSize,
              fontWeight: 600,
              color: trendDelta > 0 ? '#059669' : '#dc2626',
            }}
          >
            {Math.abs(trendDelta)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Band label helper ───────────────────────────────────────────────

const BAND_LABELS: Record<ScoreBand, string> = {
  green: 'On Track',
  amber: 'Needs Attention',
  red: 'At Risk',
};

export function BandLabel({ band }: { band: ScoreBand }) {
  const { isDark } = useTheme();
  const colors = BAND_COLORS[band];
  return (
    <div
      style={{
        backgroundColor: isDark ? colors.bgDark : colors.bg,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 2,
        paddingBottom: 2,
        borderRadius: 999,
        display: 'inline-block',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, color: colors.text }}>
        {BAND_LABELS[band]}
      </span>
    </div>
  );
}
