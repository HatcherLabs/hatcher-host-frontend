export function buildPhantomBrowseUrl(targetUrl: string, refUrl: string): string {
  return `https://phantom.app/ul/browse/${encodeURIComponent(targetUrl)}?ref=${encodeURIComponent(refUrl)}`;
}
