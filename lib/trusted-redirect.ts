export type RedirectPolicy = 'stripe' | 'cryptnow' | 'github' | 'clawville';

const TRUSTED_HOSTS: Record<RedirectPolicy, readonly string[]> = {
  stripe: ['stripe.com'],
  cryptnow: ['cryptnow.io'],
  github: ['github.com'],
  clawville: ['clawville.world'],
};

export function trustedRedirectUrl(value: string, policy: RedirectPolicy): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The service returned an invalid redirect URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('The service returned an unsafe redirect URL.');
  }
  const hostname = url.hostname.toLowerCase();
  const allowed = TRUSTED_HOSTS[policy].some((domain) => (
    hostname === domain || hostname.endsWith(`.${domain}`)
  ));
  if (!allowed) throw new Error('The service returned an untrusted redirect host.');
  return url.toString();
}
