'use client';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  color?: string;
  size?: AvatarSize;
  image?: string;
  ring?: string;
}

const SIZE_MAP: Record<AvatarSize, { box: string; text: string; px: number }> = {
  sm: { box: 'h-8 w-8', text: 'text-caption', px: 32 },
  md: { box: 'h-10 w-10', text: 'text-body', px: 40 },
  lg: { box: 'h-12 w-12', text: 'text-heading', px: 48 },
  xl: { box: 'h-16 w-16', text: 'text-title', px: 64 },
};

/** Returns white or dark text based on background luminance (WCAG AA). */
function contrastText(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance =
    0.2126 * (r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4) +
    0.7152 * (g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4) +
    0.0722 * (b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4);
  return luminance > 0.4 ? '#1C1917' : '#FFFFFF';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

export function Avatar({ name, color = '#059669', size = 'md', image, ring }: AvatarProps) {
  const s = SIZE_MAP[size];

  return (
    <div
      className={`${s.box} rounded-pill flex items-center justify-center shrink-0 overflow-hidden`}
      style={{
        backgroundColor: image ? undefined : color,
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {image ? (
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className={`${s.text} font-bold select-none`} style={{ color: contrastText(color) }}>
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}

/* ── AvatarGroup ── */

interface AvatarGroupProps {
  avatars: Array<{ name: string; color?: string; image?: string }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ avatars, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((a, i) => (
        <Avatar key={i} name={a.name} color={a.color} image={a.image} size={size} />
      ))}
      {overflow > 0 && (
        <div
          className={`${SIZE_MAP[size].box} rounded-pill flex items-center justify-center bg-surface-200 dark:bg-surface-700 border-2 border-white dark:border-surface-900`}
        >
          <span className="text-micro font-bold text-surface-600 dark:text-surface-300">
            +{overflow}
          </span>
        </div>
      )}
    </div>
  );
}
