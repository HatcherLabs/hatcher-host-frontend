const LOCAL_API_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function shouldSkipStaticApiFetch(apiUrl: string): boolean {
  if (process.env.NEXT_PHASE !== 'phase-production-build') return false;

  try {
    return LOCAL_API_HOSTS.has(new URL(apiUrl).hostname);
  } catch {
    return false;
  }
}
