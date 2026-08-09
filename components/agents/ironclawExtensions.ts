/** IronClaw native extensions whose credential setup runs through an OAuth
 *  flow that requires the per-agent Hatcher callback bridge. Shared between
 *  the create flow (ChatToHatch) and the agent extensions tab so the two
 *  lists cannot drift. */
export const IRONCLAW_OAUTH_EXTENSION_IDS = new Set<string>([
  'gmail',
  'google-calendar',
  'google-docs',
  'google-drive',
  'google-sheets',
  'google-slides',
  'notion',
  'slack',
]);
