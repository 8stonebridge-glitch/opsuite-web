// Simple local-only helpers (no backend auth)

export function hashPassword(plain: string): string {
  let hash = 0;
  for (let i = 0; i < plain.length; i++) {
    hash = ((hash << 5) - hash + plain.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash));
}
