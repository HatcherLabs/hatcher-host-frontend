import type { AdminAccountState } from '@/lib/admin-account-state';

export function AccountBillingState({ account, onOpenAccount }: {
  account: AdminAccountState;
  onOpenAccount: (id: string) => void;
}) {
  const guest = account.accountKind === 'ios_guest';
  const imported = account.linkedGuestIds ?? [];
  if (!guest && !imported.length && !account.applePlans?.length) return null;
  const linkClass = 'text-[var(--color-accent)] underline underline-offset-2 break-all text-left';
  return <section aria-label="Guest purchases and account linking" className="space-y-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 text-xs">
    <h3 className="font-semibold text-[var(--text-primary)]">{guest ? 'iOS guest account' : 'Purchases and linked guests'}</h3>
    {guest && <p className="text-[var(--text-muted)]">Anonymous purchase identity. No email verification is required for guest Chat and Canvas. Deploying agents requires signing in to a verified Hatcher account.</p>}
    {guest && account.guestState !== 'linked' && <p>Not linked yet. On the guest’s device, signing in to a new or existing verified account transfers the Apple plan, remaining credits, purchase history, conversations and Canvas creations. Credits are not granted twice.</p>}
    {account.linkedAccount && <div>
      <p>Linked — purchases, remaining credits and content now belong to:</p>
      <button type="button" className={linkClass} onClick={() => onOpenAccount(account.linkedAccount!.id)}>{account.linkedAccount.username || account.linkedAccount.id}{account.linkedAccount.email ? ` · ${account.linkedAccount.email}` : ''}</button>
      <p className="mt-1 text-[var(--text-muted)]">This guest record is retained for traceability and can no longer sign in.</p>
    </div>}
    {imported.length > 0 && <div><p className="mb-1">Imported guest accounts:</p>{imported.map(id => <button key={id} type="button" className={`${linkClass} block`} onClick={() => onOpenAccount(id)}>{id}</button>)}</div>}
    {account.applePlans?.map(plan => <div key={plan.productId + plan.expiresAt} className="rounded-lg border border-[var(--border-default)] p-2">
      <p className="font-medium">Apple purchase confirmed · <span className="capitalize">{plan.tier}</span> · {plan.environment}</p>
      <p className="text-[var(--text-muted)]">Active until {new Date(plan.expiresAt).toLocaleString()}</p>
    </div>)}
    {(account.guestEnvironment === 'Sandbox' || account.applePlans?.some(p => p.environment === 'Sandbox')) && <p className="text-[var(--text-muted)]">Sandbox is a test purchase. Linking is restricted to authorized test accounts.</p>}
  </section>;
}
