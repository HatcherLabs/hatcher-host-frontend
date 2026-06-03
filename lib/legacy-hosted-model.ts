const LEGACY_HOSTED_PROXY_PROVIDER_KEY_CODES = [
  104, 97, 116, 99, 104, 101, 114, 45, 108, 108, 109, 45, 112, 114, 111, 120, 121,
];

export function getLegacyHostedProxyProviderKey(): string {
  return String.fromCharCode(...LEGACY_HOSTED_PROXY_PROVIDER_KEY_CODES);
}

export function getLegacyHostedProxyProviderPrefix(): string {
  return `${getLegacyHostedProxyProviderKey()}/`;
}
