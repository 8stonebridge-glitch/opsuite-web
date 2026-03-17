/**
 * Shared API helper utilities.
 */

export async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : 'We could not save that yet.';
    throw new Error(message);
  }
  return data as T;
}
