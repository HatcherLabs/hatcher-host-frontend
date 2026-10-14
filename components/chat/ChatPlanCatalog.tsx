"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "@/i18n/routing";
import styles from "./ChatWorkspace.module.css";

type Catalog = Extract<Awaited<ReturnType<typeof api.getTiersCatalog>>, { success: true }>["data"];

export function ChatPlanCatalog({ kind, guest, onNavigate }: {
  kind: "agents" | "credits";
  guest: boolean;
  onNavigate: () => void;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.getTiersCatalog().then(result => {
      if (!active) return;
      if (result.success) setCatalog(result.data);
      else setError("Plans could not be loaded. Open billing to see current options.");
    }).catch(() => { if (active) setError("Plans could not be loaded. Please try again."); });
    return () => { active = false; };
  }, []);
  const billingHref = (key: string) => {
    const path = `/dashboard/billing?${kind === "agents" ? "tier" : "addon"}=${encodeURIComponent(key)}`;
    return guest ? `/register?return=${encodeURIComponent(path)}` : path;
  };
  return <>
    <p className={styles.planDescription}>{kind === "agents"
      ? "One Hatcher plan for Web Chat, OpenClaw / Hermes / IronClaw agents and Studio. Included AI Credits are shared across your workspace."
      : "One shared balance for Web Chat, agent model usage, images, video and audio. Credits do not add agent hosting capacity."}</p>
    <p className={styles.paymentMethods}>Choose how to pay: card, SOL, USDC, HATCHER, ANSEM or CryptoNow.</p>
    {error ? <p role="alert">{error} <Link href="/dashboard/billing">Open billing</Link></p> : !catalog ? <p role="status">Loading current plans…</p> : null}
    <div className={styles.planGrid}>
      {kind === "agents" ? catalog?.tierOrder.filter(key => key !== "free" && (key !== "founding_member" || catalog.founding.remaining > 0)).map(key => {
        const tier = catalog.tiers[key];
        if (!tier) return null;
        return <article key={key}>
          <h3>{tier.name}</h3>
          <strong>${tier.usdPrice.toFixed(2)} <small>{key === "founding_member" ? "lifetime" : "/ 30 days"}</small></strong>
          <ul><li>{tier.includedAgents} hosted {tier.includedAgents === 1 ? "agent" : "agents"}</li><li>OpenClaw, Hermes and IronClaw</li><li>Agent configuration and integrations</li><li>Web Chat and Studio access</li><li>{tier.aiCreditsMonthly.toLocaleString()} shared AI Credits / month</li></ul>
          <Link className={styles.planCta} href={billingHref(key)} onClick={onNavigate}>{guest ? "Create account to choose" : "Choose payment method"}</Link>
        </article>;
      }) : catalog?.addons.filter(addon => addon.key.startsWith("addon.ai_credits.")).map(addon => <article key={addon.key}>
        <h3>{addon.name}</h3><strong>${addon.usdPrice.toFixed(2)} <small>one-time</small></strong>
        <p>Use credits across Chat, your agents and Studio. Keep the plan you already have.</p>
        <Link className={styles.planCta} href={billingHref(addon.key)} onClick={onNavigate}>{guest ? "Create account to choose" : "Choose payment method"}</Link>
      </article>)}
    </div>
  </>;
}
