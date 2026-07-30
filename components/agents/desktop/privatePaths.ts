/**
 * Client mirror of the API's private-path rule for agent container files.
 *
 * A workspace-relative path is private iff any of its segments equals
 * `private` (case-insensitive) or starts with `.`. The segment must EQUAL
 * `private` — `privateer` and `my.private` are public.
 */
export function isPrivateClientPath(path: string): boolean {
  return path
    .split('/')
    .filter(Boolean)
    .some((segment) => segment.toLowerCase() === 'private' || segment.startsWith('.'));
}

/**
 * Destination for the "Make private" action: a `private` folder next to the
 * entry. `'/ws/docs/x.pdf'` → `{dir: '/ws/docs/private', to: '/ws/docs/private/x.pdf'}`.
 */
export function makePrivateDestination(path: string): { dir: string; to: string } {
  const segments = path.split('/');
  const name = segments.pop() ?? '';
  const dir = `${segments.join('/')}/private`;
  return { dir, to: `${dir}/${name}` };
}
