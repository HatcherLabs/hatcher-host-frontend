import { API_URL } from '@/lib/config';

type ProfileResult<T> =
  | { status: 'found'; data: T }
  | { status: 'missing' }
  | { status: 'unavailable' };

/** Upstream outages must never permanently deindex an existing public profile. */
export async function fetchPublicProfile<T>(path: string): Promise<ProfileResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 404 || response.status === 410) return { status: 'missing' };
    if (!response.ok) return { status: 'unavailable' };
    const body = await response.json() as { success: boolean; data?: T };
    return body.success && body.data
      ? { status: 'found', data: body.data }
      : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
