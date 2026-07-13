'use client';

import { Bot, ListChecks, PackageCheck, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { agentWorkspaceHref } from '@/lib/agent-workspace';
import {
  DASHBOARD_WORKSPACE_ROUTES,
  isDashboardWorkspaceRouteActive,
  type DashboardWorkspaceKey,
} from '@/lib/dashboard-overview';
import styles from './DashboardWorkspaceNavigation.module.css';

const ICONS = {
  agents: Bot,
  missions: ListChecks,
  outcomePacks: PackageCheck,
  approvals: ShieldCheck,
} satisfies Record<DashboardWorkspaceKey, typeof Bot>;

export function DashboardWorkspaceNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tNav = useTranslations('nav');
  const tOutcome = useTranslations('outcomePacks');
  const activeRoute = DASHBOARD_WORKSPACE_ROUTES.find((route) =>
    isDashboardWorkspaceRouteActive(pathname, route.key));

  if (!activeRoute) return null;

  const labels: Record<DashboardWorkspaceKey, string> = {
    agents: tNav('myAgents'),
    missions: tNav('missionControl'),
    outcomePacks: tOutcome('title'),
    approvals: 'Approvals',
  };

  return (
    <div className={styles.shell} data-dashboard-workspace-nav>
      <nav className={styles.inner} aria-label={tNav('dashboard')}>
        <div className={styles.links}>
          {DASHBOARD_WORKSPACE_ROUTES.map((route) => {
            const active = route.key === activeRoute.key;
            const Icon = ICONS[route.key];
            const agentId = searchParams.get('agent');
            const href = agentId && (route.key === 'missions' || route.key === 'outcomePacks' || route.key === 'approvals')
              ? agentWorkspaceHref(route.href, agentId)
              : route.href;
            return (
              <Link
                key={route.key}
                href={href}
                className={`${styles.link} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden />
                <span>{labels[route.key]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
