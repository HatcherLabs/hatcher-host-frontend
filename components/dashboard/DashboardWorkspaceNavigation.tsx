'use client';

import { Bot, LayoutDashboard, ListChecks, PackageCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import {
  DASHBOARD_WORKSPACE_ROUTES,
  isDashboardWorkspaceRouteActive,
  type DashboardWorkspaceKey,
} from '@/lib/dashboard-overview';
import styles from './DashboardWorkspaceNavigation.module.css';

const ICONS = {
  overview: LayoutDashboard,
  agents: Bot,
  missions: ListChecks,
  outcomePacks: PackageCheck,
} satisfies Record<DashboardWorkspaceKey, typeof LayoutDashboard>;

export function DashboardWorkspaceNavigation() {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const tOutcome = useTranslations('outcomePacks');
  const activeRoute = DASHBOARD_WORKSPACE_ROUTES.find((route) =>
    isDashboardWorkspaceRouteActive(pathname, route.key));

  if (!activeRoute) return null;

  const labels: Record<DashboardWorkspaceKey, string> = {
    overview: tNav('dashboard'),
    agents: tNav('myAgents'),
    missions: tNav('missionControl'),
    outcomePacks: tOutcome('title'),
  };

  return (
    <div className={styles.shell} data-dashboard-workspace-nav>
      <nav className={styles.inner} aria-label={tNav('dashboard')}>
        <div className={styles.links}>
          {DASHBOARD_WORKSPACE_ROUTES.map((route) => {
            const active = route.key === activeRoute.key;
            const Icon = ICONS[route.key];
            return (
              <Link
                key={route.key}
                href={route.href}
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
