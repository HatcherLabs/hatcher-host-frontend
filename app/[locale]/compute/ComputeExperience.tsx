'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Apple,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  CircleDollarSign,
  CircuitBoard,
  Cpu,
  FileCheck2,
  Gauge,
  GitBranch,
  Info,
  Landmark,
  LockKeyhole,
  Network,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  TerminalSquare,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  computeNetworkStats,
  deviceClasses,
  executionModes,
  type ComputeNetworkMetricId,
  type ComputePlatform,
  type DeviceClassId,
  type ExecutionModeId,
} from './compute-data';
import styles from './page.module.css';

const NETWORK_ICONS: Record<ComputeNetworkMetricId, LucideIcon> = {
  'active-nodes': Network,
  'available-vram': CircuitBoard,
  'jobs-24h': FileCheck2,
  'provider-payouts': WalletCards,
};

const DEVICE_ICONS: Record<DeviceClassId, LucideIcon> = {
  'cpu-integrated': Cpu,
  'vram-4-8': CircuitBoard,
  'vram-12-24': Gauge,
  'multi-gpu': Server,
};

const PLATFORM_ICONS: Record<ComputePlatform, LucideIcon> = {
  windows: TerminalSquare,
  macos: Apple,
  linux: TerminalSquare,
};

const timeRanges = ['1h', '6h', '24h', '7d'] as const;
type TimeRange = (typeof timeRanges)[number];
type PlatformFilter = 'all' | ComputePlatform;

export function ComputeExperience() {
  const t = useTranslations('compute');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [mode, setMode] = useState<ExecutionModeId>('distributed-tasks');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [deviceClass, setDeviceClass] = useState<DeviceClassId>('vram-4-8');
  const [hours, setHours] = useState(8);
  const [utilization, setUtilization] = useState(60);

  const filteredDevices = useMemo(
    () =>
      platform === 'all'
        ? deviceClasses
        : deviceClasses.filter((device) =>
            (device.platforms as readonly ComputePlatform[]).includes(platform),
          ),
    [platform],
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="compute-title">
        <div className={styles.heroCopy}>
          <h1 id="compute-title">{t('hero.title')}</h1>
          <p className={styles.heroText}>{t('hero.body')}</p>
          <div className={styles.actions}>
            <Link href="/support?topic=compute-provider-alpha" className={styles.primaryAction}>
              {t('actions.joinAlpha')}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/docs/api" className={styles.secondaryAction}>
              {t('actions.useApi')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.alphaLine}>
            <span aria-hidden="true" />
            {t('network.alphaStatus')}
          </p>
        </div>

        <aside className={styles.networkPanel} aria-labelledby="network-overview-title">
          <header className={styles.networkHeader}>
            <h2 id="network-overview-title">
              <Activity aria-hidden="true" />
              {t('network.title')}
            </h2>
            <div className={styles.timeControl} aria-label={t('network.timeRange')}>
              {timeRanges.map((range) => (
                <button
                  key={range}
                  type="button"
                  aria-pressed={timeRange === range}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </header>
          <dl className={styles.metricList}>
            {computeNetworkStats.metrics.map((metric) => {
              const Icon = NETWORK_ICONS[metric.id];
              return (
                <div key={metric.id}>
                  <dt>
                    <span className={styles.metricIcon} aria-hidden="true"><Icon /></span>
                    {t(`network.metrics.${metric.id}`)}
                  </dt>
                  <dd aria-label={t('network.notAvailable')}>{metric.value ?? '—'}</dd>
                </div>
              );
            })}
          </dl>
          <p className={styles.telemetryNote}>
            <Info aria-hidden="true" />
            {t('network.telemetryNote')}
          </p>
        </aside>
      </section>

      <section className={styles.executionSection} aria-labelledby="execution-title">
        <div className={styles.sectionIntro}>
          <div>
            <h2 id="execution-title">{t('execution.title')}</h2>
            <p>{t('execution.body')}</p>
          </div>
          <div className={styles.selectedMode}>
            <span>{t('execution.selectedMode')}</span>
            <strong><GitBranch aria-hidden="true" />{t(`execution.modes.${mode}.title`)}</strong>
          </div>
        </div>

        <div className={styles.modeRail} role="group" aria-label={t('execution.modeSelector')}>
          {executionModes.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
            >
              <span>{index + 1}</span>
              <strong>{t(`execution.modes.${item.id}.title`)}</strong>
              <small>{t(`execution.modes.${item.id}.note`)}</small>
            </button>
          ))}
        </div>

        <ExecutionDiagram mode={mode} />

        <div className={styles.tableHeader}>
          <h3>{t('devices.title')}</h3>
          <div className={styles.platformFilters} aria-label={t('devices.filterLabel')}>
            {(['all', 'windows', 'macos', 'linux'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={platform === item}
                onClick={() => setPlatform(item)}
              >
                {t(`platforms.${item}`)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{t('devices.columns.device')}</th>
                <th>{t('devices.columns.bestFor')}</th>
                <th>{t('devices.columns.runtime')}</th>
                <th>{t('devices.columns.availability')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => {
                const Icon = DEVICE_ICONS[device.id];
                return (
                  <tr key={device.id}>
                    <td><Icon aria-hidden="true" />{t(`devices.classes.${device.id}.label`)}</td>
                    <td>{t(`devices.classes.${device.id}.work`)}</td>
                    <td className={styles.mono}>{device.runtimes}</td>
                    <td><span className={styles.availability}>{t(`availability.${device.availability}`)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={styles.splitNote}>{t('devices.splitNote')}</p>
      </section>

      <section className={styles.estimatorSection} aria-labelledby="estimator-title">
        <div className={styles.estimatorControls}>
          <h2 id="estimator-title">{t('estimator.title')}</h2>
          <p>{t('estimator.body')}</p>
          <fieldset className={styles.devicePicker}>
            <legend>{t('estimator.deviceClass')}</legend>
            <div>
              {deviceClasses.map((device) => {
                const Icon = DEVICE_ICONS[device.id];
                return (
                  <button
                    key={device.id}
                    type="button"
                    aria-pressed={deviceClass === device.id}
                    onClick={() => setDeviceClass(device.id)}
                  >
                    <Icon aria-hidden="true" />
                    {t(`devices.classes.${device.id}.label`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <RangeControl
            id="available-hours"
            label={t('estimator.hours')}
            value={hours}
            min={1}
            max={24}
            suffix="h"
            onChange={setHours}
          />
          <RangeControl
            id="utilization"
            label={t('estimator.utilization')}
            value={utilization}
            min={10}
            max={100}
            step={10}
            suffix="%"
            onChange={setUtilization}
          />
          <p className={styles.inputNote}>
            <Info aria-hidden="true" />
            {t('estimator.inputNote')}
          </p>
        </div>

        <div className={styles.estimateResult} aria-live="polite">
          <h3>{t('estimator.resultTitle')}</h3>
          <div className={styles.emptyEstimate}>
            <BarChart3 aria-hidden="true" />
            <strong>{t('estimator.estimateUnavailable')}</strong>
            <span>
              {t(`devices.classes.${deviceClass}.label`)} · {hours}h/day · {utilization}%
            </span>
          </div>
          <p className={styles.estimateDisclaimer}>{t('estimator.estimateDisclaimer')}</p>
          <div className={styles.settlementFlow}>
            <FlowStep icon={CircleDollarSign} label={t('settlement.consumerPays')} />
            <ArrowRight aria-hidden="true" />
            <FlowStep icon={ShieldCheck} label={t('settlement.hatcherVerifies')} />
            <ArrowRight aria-hidden="true" />
            <FlowStep icon={Landmark} label={t('settlement.providerReceives')} />
          </div>
          <p className={styles.settlementNote}>{t('settlement.note')}</p>
        </div>
      </section>

      <section className={styles.onboardingSection} aria-labelledby="onboarding-title">
        <div className={styles.onboardingSteps}>
          <h2 id="onboarding-title">{t('onboarding.title')}</h2>
          <ol>
            <OnboardingStep icon={Boxes} text={t('onboarding.steps.install')} />
            <OnboardingStep icon={SlidersHorizontal} text={t('onboarding.steps.limits')} />
            <OnboardingStep icon={CheckCircle2} text={t('onboarding.steps.benchmark')} />
          </ol>
          <div className={styles.platformList}>
            {(['windows', 'macos', 'linux'] as const).map((item) => {
              const Icon = PLATFORM_ICONS[item];
              return <span key={item}><Icon aria-hidden="true" />{t(`platforms.${item}`)}</span>;
            })}
          </div>
        </div>

        <div className={styles.securityList}>
          <h2>{t('security.title')}</h2>
          <ul>
            <li><LockKeyhole aria-hidden="true" />{t('security.outbound')}</li>
            <li><FileCheck2 aria-hidden="true" />{t('security.signed')}</li>
            <li><SlidersHorizontal aria-hidden="true" />{t('security.limits')}</li>
            <li><ShieldCheck aria-hidden="true" />{t('security.verified')}</li>
          </ul>
        </div>

        <div className={styles.finalActions}>
          <Link href="/support?topic=compute-provider-alpha" className={styles.primaryAction}>
            {t('actions.joinAlpha')}<ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/roadmap" className={styles.secondaryAction}>
            {t('actions.readPlan')}<ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function ExecutionDiagram({ mode }: { mode: ExecutionModeId }) {
  const t = useTranslations('compute.execution');
  const nodes = mode === 'single-node'
    ? ['primary']
    : mode === 'distributed-tasks'
      ? ['large', 'small', 'verify']
      : ['shardA', 'shardB', 'shardC'];

  return (
    <div className={styles.executionDiagram}>
      <div className={styles.requestNode}><FileCheck2 aria-hidden="true" /><span>{t('diagram.request')}</span></div>
      <ArrowRight className={styles.diagramArrow} aria-hidden="true" />
      <div className={styles.schedulerNode}><Server aria-hidden="true" /><span><strong>{t('diagram.scheduler')}</strong><small>{t('diagram.routing')}</small></span></div>
      <ArrowRight className={styles.diagramArrow} aria-hidden="true" />
      <div className={styles.workerStack}>
        {nodes.map((node) => (
          <div key={node}><CircuitBoard aria-hidden="true" /><span><strong>{t(`diagram.nodes.${node}.title`)}</strong><small>{t(`diagram.nodes.${node}.detail`)}</small></span><Check aria-hidden="true" /></div>
        ))}
      </div>
    </div>
  );
}

function RangeControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.rangeControl} htmlFor={id}>
      <span><strong>{label}</strong><output htmlFor={id}>{value}{suffix}</output></span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small><span>{min}{suffix}</span><span>{max}{suffix}</span></small>
    </label>
  );
}

function FlowStep({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return <div><span><Icon aria-hidden="true" /></span><strong>{label}</strong></div>;
}

function OnboardingStep({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <li><span><Icon aria-hidden="true" /></span><strong>{text}</strong></li>;
}
