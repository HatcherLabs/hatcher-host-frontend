export type AdminAccountState = {
  effectiveTier?: string;
  baseTier?: string;
  accountKind?: 'registered' | 'ios_guest';
  guestState?: 'active' | 'linked' | null;
  guestEnvironment?: string | null;
  linkedAccount?: { id: string; username: string; email: string } | null;
  linkedGuestIds?: string[];
  applePlans?: Array<{ tier: string; environment: string; expiresAt: string; productId: string }>;
};
