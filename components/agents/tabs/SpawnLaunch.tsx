'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  ClipboardList,
  Coins,
  Copy,
  Image as ImageIcon,
  Rocket,
  SlidersHorizontal,
  Target,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  SpawnDna,
  SpawnPaymentInstructions,
} from '@/lib/api';
import { useToast } from '@/components/ui/ToastProvider';
import { GlassCard, useAgentContext } from '@/components/agents/AgentContext';

type TradingMode = 'memecoin' | 'prediction' | 'both';
type PmExitStrategy = 'target' | 'trail' | 'hold';
type PmPriceZone = 'any' | 'balanced' | 'cheap' | 'premium' | 'custom';
type Confidence = 'any' | 'medium' | 'high';

const LAUNCHPAD_OPTIONS = [
  { id: 'pump', label: 'pump.fun' },
  { id: 'jupiter', label: 'Jupiter Verified' },
  { id: 'brrr', label: 'printr' },
  { id: 'BAGS', label: 'bags.fm' },
  { id: 'bonk', label: 'bonk.fun' },
] as const;

const PM_CATEGORY_OPTIONS = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'politics', label: 'Politics' },
  { id: 'sports', label: 'Sports' },
  { id: 'economics', label: 'Economics' },
  { id: 'tech', label: 'Tech' },
  { id: 'esports', label: 'Esports' },
] as const;

const SPORTS_FILTER_OPTIONS = [
  'nba',
  'nfl',
  'nhl',
  'mlb',
  'soccer',
  'tennis',
  'motorsport',
  'mma',
  'other',
] as const;

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image file.'));
    image.src = dataUrl;
  });
}

async function readImageFileAsAvatarDataUrl(file: File): Promise<string> {
  const dataUrl = await readImageFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const cropSize = Math.min(image.width, image.height);
  if (cropSize <= 0) throw new Error('Avatar image is empty.');

  const outputSize = 512;
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare avatar image.');

  context.drawImage(
    image,
    Math.max(0, (image.width - cropSize) / 2),
    Math.max(0, (image.height - cropSize) / 2),
    cropSize,
    cropSize,
    0,
    0,
    outputSize,
    outputSize,
  );
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function SpawnLaunch({
  onPaymentPrepared,
}: {
  onPaymentPrepared: (payment: SpawnPaymentInstructions) => void;
}) {
  const { agent } = useAgentContext();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [predictionOpen, setPredictionOpen] = useState(true);

  const [tradingMode, setTradingMode] = useState<TradingMode>('memecoin');
  const [name, setName] = useState(`${agent.name} Spawn`);
  const [solAmount, setSolAmount] = useState('0.2');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');

  const [aggression, setAggression] = useState(0.65);
  const [riskTolerance, setRiskTolerance] = useState(0.55);
  const [patience, setPatience] = useState(0.45);
  const [stopLossPct, setStopLossPct] = useState(25);
  const [takeProfitPct, setTakeProfitPct] = useState(100);
  const [maxPositionPct, setMaxPositionPct] = useState(20);
  const [maxTradeSol, setMaxTradeSol] = useState(0.05);
  const [launchpads, setLaunchpads] = useState<string[]>(['pump', 'jupiter']);

  const [minHolders, setMinHolders] = useState(100);
  const [minVolume24h, setMinVolume24h] = useState(10_000);
  const [minVolume1h, setMinVolume1h] = useState(10_000);
  const [maxPositions, setMaxPositions] = useState(3);
  const [buyCooldownMin, setBuyCooldownMin] = useState(10);
  const [minMarketCap, setMinMarketCap] = useState(5_000);
  const [maxMarketCap, setMaxMarketCap] = useState(1_000_000);
  const [minPairAgeHours, setMinPairAgeHours] = useState(0);
  const [maxPairAgeHours, setMaxPairAgeHours] = useState(24);
  const [maxPriceChange1h, setMaxPriceChange1h] = useState(200);
  const [requireDexPaid, setRequireDexPaid] = useState(false);
  const [requireSocials, setRequireSocials] = useState(true);
  const [dcaEnabled, setDcaEnabled] = useState(false);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
  const [trailingStopPct, setTrailingStopPct] = useState(20);
  const [sniper, setSniper] = useState(false);
  const [evolveMode, setEvolveMode] = useState(false);
  const [activeHoursEnabled, setActiveHoursEnabled] = useState(false);
  const [activeHoursStart, setActiveHoursStart] = useState(0);
  const [activeHoursEnd, setActiveHoursEnd] = useState(23);

  const [reproductionCostSol, setReproductionCostSol] = useState(0.2);
  const [royaltyPct, setRoyaltyPct] = useState(5);

  const [pmCategories, setPmCategories] = useState<string[]>(['crypto', 'politics', 'sports']);
  const [pmEdgeThreshold, setPmEdgeThreshold] = useState(5);
  const [pmMaxPositionPct, setPmMaxPositionPct] = useState(10);
  const [pmMaxPositions, setPmMaxPositions] = useState(10);
  const [pmMaxDaysToResolution, setPmMaxDaysToResolution] = useState(30);
  const [pmMinLiquidityUsd, setPmMinLiquidityUsd] = useState(5_000);
  const [pmPriceZone, setPmPriceZone] = useState<PmPriceZone>('balanced');
  const [pmPriceMin, setPmPriceMin] = useState(0.3);
  const [pmPriceMax, setPmPriceMax] = useState(0.7);
  const [pmSellStrategy, setPmSellStrategy] = useState<PmExitStrategy>('target');
  const [pmTargetPct, setPmTargetPct] = useState(50);
  const [pmTrailPct, setPmTrailPct] = useState(15);
  const [pmStopLossPct, setPmStopLossPct] = useState(0);
  const [pmMinConfidence, setPmMinConfidence] = useState<Confidence>('high');
  const [pmMinTradeUsd, setPmMinTradeUsd] = useState(10);
  const [pmMaxTradeUsd, setPmMaxTradeUsd] = useState(100);
  const [pmSportsFilter, setPmSportsFilter] = useState<string[]>([]);
  const [pmDriftOnly, setPmDriftOnly] = useState(false);

  const tradesMemecoins = tradingMode === 'memecoin' || tradingMode === 'both';
  const tradesPrediction = tradingMode === 'prediction' || tradingMode === 'both';

  const generatedDna = useMemo<SpawnDna>(() => {
    const dna: SpawnDna = {
      trades_memecoins: tradesMemecoins,
      trades_prediction: tradesPrediction,
      reproduction_cost_sol: reproductionCostSol,
      royalty_pct: royaltyPct / 100,
    };

    if (tradesMemecoins) {
      Object.assign(dna, {
        aggression,
        patience,
        risk_tolerance: riskTolerance,
        sell_profit_pct: takeProfitPct,
        sell_loss_pct: stopLossPct,
        max_position_pct: maxPositionPct,
        max_trade_sol: maxTradeSol,
        launchpads,
        buy_threshold_holders: minHolders,
        buy_threshold_volume: minVolume24h,
        buy_threshold_volume_1h: minVolume1h,
        max_positions_memecoin: maxPositions,
        buy_cooldown_min: buyCooldownMin,
        min_mcap: minMarketCap,
        max_mcap: maxMarketCap,
        min_pair_age_hours: minPairAgeHours,
        max_pair_age_hours: maxPairAgeHours,
        max_price_change_1h: maxPriceChange1h,
        require_dex_paid: requireDexPaid,
        require_socials: requireSocials,
        dca_enabled: dcaEnabled,
        sniper,
      });
      if (trailingStopEnabled) dna.trailing_stop_pct = trailingStopPct;
      if (evolveMode) dna.evolve = true;
      if (activeHoursEnabled) {
        dna.active_hours_start = activeHoursStart;
        dna.active_hours_end = activeHoursEnd;
      }
    }

    if (tradesPrediction) {
      Object.assign(dna, {
        pm_categories: pmCategories,
        pm_edge_threshold: pmEdgeThreshold,
        pm_max_position_pct: pmMaxPositionPct,
        pm_max_positions: pmMaxPositions,
        pm_max_days_to_resolution: pmMaxDaysToResolution,
        pm_min_liquidity_usd: pmMinLiquidityUsd,
        pm_price_zone: pmPriceZone,
        pm_sell_strategy: pmSellStrategy,
        pm_min_confidence: pmMinConfidence,
        pm_min_trade_usd: pmMinTradeUsd,
        pm_max_trade_usd: pmMaxTradeUsd,
        pm_drift_only: pmDriftOnly,
      });
      if (pmPriceZone === 'custom') {
        dna.pm_price_min = pmPriceMin;
        dna.pm_price_max = pmPriceMax;
      }
      if (pmSellStrategy === 'target') dna.pm_target_pct = pmTargetPct / 100;
      if (pmSellStrategy === 'trail') dna.pm_trail_pct = pmTrailPct / 100;
      if (pmStopLossPct > 0) dna.pm_stop_loss_pct = pmStopLossPct / 100;
      if (pmCategories.includes('sports') && pmSportsFilter.length > 0) {
        dna.pm_sports_filter = pmSportsFilter;
      }
    }

    return dna;
  }, [
    activeHoursEnabled,
    activeHoursEnd,
    activeHoursStart,
    aggression,
    buyCooldownMin,
    dcaEnabled,
    evolveMode,
    launchpads,
    maxMarketCap,
    maxPairAgeHours,
    maxPositionPct,
    maxPositions,
    maxPriceChange1h,
    maxTradeSol,
    minHolders,
    minMarketCap,
    minPairAgeHours,
    minVolume1h,
    minVolume24h,
    patience,
    pmCategories,
    pmDriftOnly,
    pmEdgeThreshold,
    pmMaxDaysToResolution,
    pmMaxPositionPct,
    pmMaxPositions,
    pmMaxTradeUsd,
    pmMinConfidence,
    pmMinLiquidityUsd,
    pmMinTradeUsd,
    pmPriceMax,
    pmPriceMin,
    pmPriceZone,
    pmSellStrategy,
    pmSportsFilter,
    pmStopLossPct,
    pmTargetPct,
    pmTrailPct,
    reproductionCostSol,
    requireDexPaid,
    requireSocials,
    riskTolerance,
    royaltyPct,
    sniper,
    stopLossPct,
    takeProfitPct,
    tradesMemecoins,
    tradesPrediction,
    trailingStopEnabled,
    trailingStopPct,
  ]);

  const applyPreset = (preset: 'balanced' | 'sniper' | 'prediction' | 'hybrid') => {
    setFormError(null);
    if (preset === 'balanced') {
      setTradingMode('memecoin');
      setAggression(0.55);
      setRiskTolerance(0.45);
      setPatience(0.6);
      setStopLossPct(20);
      setTakeProfitPct(100);
      setMaxPositionPct(20);
      setMaxTradeSol(0.05);
      setLaunchpads(['pump', 'jupiter']);
      setRequireSocials(true);
      setRequireDexPaid(false);
      setSniper(false);
      setDcaEnabled(false);
      return;
    }
    if (preset === 'sniper') {
      setTradingMode('memecoin');
      setAggression(0.9);
      setRiskTolerance(0.75);
      setPatience(0.2);
      setStopLossPct(30);
      setTakeProfitPct(150);
      setMaxPositionPct(30);
      setMaxTradeSol(0.15);
      setLaunchpads(['pump', 'bonk']);
      setMinHolders(10);
      setMinVolume24h(1_000);
      setMinPairAgeHours(0);
      setMaxPairAgeHours(6);
      setRequireSocials(false);
      setSniper(true);
      setDcaEnabled(false);
      setAdvancedOpen(true);
      return;
    }
    if (preset === 'prediction') {
      setTradingMode('prediction');
      setPmCategories(['politics', 'economics', 'sports']);
      setPmEdgeThreshold(7);
      setPmMaxPositionPct(10);
      setPmMaxPositions(10);
      setPmSellStrategy('hold');
      setPmMinConfidence('high');
      setPredictionOpen(true);
      return;
    }
    setTradingMode('both');
    setAggression(0.6);
    setRiskTolerance(0.55);
    setPatience(0.45);
    setPmCategories(['crypto', 'politics', 'sports']);
    setPmEdgeThreshold(5);
    setPmSellStrategy('target');
    setPredictionOpen(true);
  };

  const validateForm = (): boolean => {
    const amount = Number(solAmount);
    if (!name.trim()) {
      setFormError('Agent name is required.');
      return false;
    }
    if (!Number.isFinite(amount) || amount < 0.2) {
      setFormError('Spawn requires at least 0.2 SOL.');
      return false;
    }
    if (tradesMemecoins && launchpads.length === 0) {
      setFormError('Select at least one launchpad.');
      return false;
    }
    if (tradesPrediction && pmCategories.length === 0) {
      setFormError('Select at least one prediction category.');
      return false;
    }
    if (tradesPrediction && pmMinTradeUsd > pmMaxTradeUsd) {
      setFormError('Prediction min trade must be less than or equal to max trade.');
      return false;
    }
    if (pmPriceZone === 'custom' && pmPriceMin >= pmPriceMax) {
      setFormError('Custom prediction price min must be lower than max.');
      return false;
    }
    setFormError(null);
    return true;
  };

  const createSpawnAgent = async () => {
    if (!validateForm()) return;
    setCreating(true);
    try {
      const res = await api.createAgentSpawnAgent(agent.id, {
        name: name.trim(),
        solAmount: Number(solAmount),
        dna: generatedDna,
        meta: {
          ...(avatar.trim() ? { avatar: avatar.trim() } : {}),
          ...(bio.trim() ? { bio: bio.trim() } : {}),
        },
      });
      if (res.success) {
        onPaymentPrepared(res.data);
        toast.success('Spawn payment prepared. Review the deposit before funding.');
      } else {
        setFormError(res.error);
      }
    } finally {
      setCreating(false);
    }
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  const copyDna = async () => {
    await copyText(formatJson(generatedDna));
  };

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Avatar upload must be an image file.');
      return;
    }
    if (file.size > 50_000_000) {
      setFormError('Avatar image must be 50MB or smaller.');
      return;
    }
    setAvatarUploading(true);
    try {
      const compressedAvatar = await readImageFileAsAvatarDataUrl(file);
      setAvatar(compressedAvatar);
      const uploaded = await api.uploadAgentSpawnAvatar(agent.id, { dataUrl: compressedAvatar });
      if (uploaded.success) {
        setAvatar(uploaded.data.avatar);
      } else {
        setFormError(`Avatar upload failed: ${uploaded.error}`);
        return;
      }
      setFormError(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not read image file.');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)]">
        <div className="space-y-5">
          <GlassCard className="p-5">
            <SectionHeader icon={<SlidersHorizontal size={17} />} title="Design a Spawn agent" />

            <div className="mt-4 space-y-5">
              <div>
                <LabelText>Trading Mode</LabelText>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <SegmentButton active={tradingMode === 'memecoin'} onClick={() => setTradingMode('memecoin')}>
                    Memecoins
                  </SegmentButton>
                  <SegmentButton active={tradingMode === 'prediction'} onClick={() => setTradingMode('prediction')}>
                    Prediction
                  </SegmentButton>
                  <SegmentButton active={tradingMode === 'both'} onClick={() => setTradingMode('both')}>
                    Both
                  </SegmentButton>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Memecoins trade Solana launchpads. Prediction agents use Jupiter Predict / Polymarket style markets.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Agent Name" value={name} onChange={setName} />
                <TextField label="Initial Deposit" value={solAmount} onChange={setSolAmount} suffix="SOL" />
                <TextField label="Avatar URL" value={avatar} onChange={setAvatar} placeholder="https://..." icon={<ImageIcon size={14} />} />
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Avatar Upload
                  <span className="mt-1 flex min-h-[38px] cursor-pointer items-center justify-between gap-2 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Upload size={14} className="text-[var(--text-muted)]" />
                      <span className="truncate">{avatarUploading ? 'Uploading avatar...' : 'Choose image from device'}</span>
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">max 50MB</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={avatarUploading}
                    onChange={(e) => void handleAvatarFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <TextArea label="Bio / Motto" value={bio} onChange={setBio} rows={2} />
              </div>

              {tradesMemecoins && (
                <div className="space-y-5">
                  <SectionHeader icon={<Coins size={17} />} title="Memecoin DNA" />
                  <div>
                    <LabelText>Launchpads</LabelText>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {LAUNCHPAD_OPTIONS.map((option) => (
                        <CheckButton
                          key={option.id}
                          selected={launchpads.includes(option.id)}
                          onClick={() => setLaunchpads((current) => toggleValue(current, option.id))}
                        >
                          {option.label}
                        </CheckButton>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <RangeControl label="Aggression" value={aggression} onChange={setAggression} min={0} max={1} step={0.01} />
                    <RangeControl label="Risk Tolerance" value={riskTolerance} onChange={setRiskTolerance} min={0} max={1} step={0.01} />
                    <RangeControl label="Patience" value={patience} onChange={setPatience} min={0} max={1} step={0.01} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <NumberField label="Stop Loss" value={stopLossPct} onChange={setStopLossPct} min={1} max={100} suffix="%" />
                    <NumberField label="Take Profit" value={takeProfitPct} onChange={setTakeProfitPct} min={0} max={1000} suffix="%" />
                    <NumberField label="Max Position" value={maxPositionPct} onChange={setMaxPositionPct} min={10} max={90} suffix="%" />
                    <NumberField label="Max Trade" value={maxTradeSol} onChange={setMaxTradeSol} min={0.01} max={100} step={0.01} suffix="SOL" />
                  </div>

                  <CollapsibleTitle open={advancedOpen} onClick={() => setAdvancedOpen((value) => !value)}>
                    Advanced memecoin filters
                  </CollapsibleTitle>
                  {advancedOpen && (
                    <div className="space-y-4 rounded-md border border-[var(--border-default)] p-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <NumberField label="Min Holders" value={minHolders} onChange={setMinHolders} min={10} max={2000} />
                        <NumberField label="Min 24h Volume" value={minVolume24h} onChange={setMinVolume24h} min={1000} max={1_000_000} prefix="$" />
                        <NumberField label="Min 1h Volume" value={minVolume1h} onChange={setMinVolume1h} min={0} max={100_000} prefix="$" />
                        <NumberField label="Max Positions" value={maxPositions} onChange={setMaxPositions} min={1} max={20} />
                        <NumberField label="Buy Cooldown" value={buyCooldownMin} onChange={setBuyCooldownMin} min={0} max={60} suffix="m" />
                        <NumberField label="Min Market Cap" value={minMarketCap} onChange={setMinMarketCap} min={5000} max={100_000_000} prefix="$" />
                        <NumberField label="Max Market Cap" value={maxMarketCap} onChange={setMaxMarketCap} min={50_000} max={1_000_000_000} prefix="$" />
                        <NumberField label="Max 1h Pump" value={maxPriceChange1h} onChange={setMaxPriceChange1h} min={1} max={10_000} suffix="%" />
                        <NumberField label="Min Pair Age" value={minPairAgeHours} onChange={setMinPairAgeHours} min={0} max={720} suffix="h" />
                        <NumberField label="Max Pair Age" value={maxPairAgeHours} onChange={setMaxPairAgeHours} min={1} max={720} suffix="h" />
                        <NumberField label="Reproduction Cost" value={reproductionCostSol} onChange={setReproductionCostSol} min={0.2} max={5} step={0.01} suffix="SOL" />
                        <NumberField label="Royalty" value={royaltyPct} onChange={setRoyaltyPct} min={0} max={30} step={0.1} suffix="%" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <CheckButton selected={requireDexPaid} onClick={() => setRequireDexPaid((value) => !value)}>Require DEX paid</CheckButton>
                        <CheckButton selected={requireSocials} onClick={() => setRequireSocials((value) => !value)}>Require socials</CheckButton>
                        <CheckButton selected={dcaEnabled} onClick={() => setDcaEnabled((value) => !value)}>DCA buys</CheckButton>
                        <CheckButton selected={sniper} onClick={() => setSniper((value) => !value)}>Sniper mode</CheckButton>
                        <CheckButton selected={evolveMode} onClick={() => setEvolveMode((value) => !value)}>Evolve mode</CheckButton>
                        <CheckButton selected={trailingStopEnabled} onClick={() => setTrailingStopEnabled((value) => !value)}>Trailing stop</CheckButton>
                        <CheckButton selected={activeHoursEnabled} onClick={() => setActiveHoursEnabled((value) => !value)}>Trading hours</CheckButton>
                      </div>
                      {(trailingStopEnabled || activeHoursEnabled) && (
                        <div className="grid gap-3 md:grid-cols-3">
                          {trailingStopEnabled && <NumberField label="Trail Drop" value={trailingStopPct} onChange={setTrailingStopPct} min={5} max={50} suffix="%" />}
                          {activeHoursEnabled && <NumberField label="Start UTC" value={activeHoursStart} onChange={setActiveHoursStart} min={0} max={23} suffix="h" />}
                          {activeHoursEnabled && <NumberField label="End UTC" value={activeHoursEnd} onChange={setActiveHoursEnd} min={0} max={23} suffix="h" />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tradesPrediction && (
                <div className="space-y-5">
                  <CollapsibleTitle open={predictionOpen} onClick={() => setPredictionOpen((value) => !value)}>
                    Prediction-market DNA
                  </CollapsibleTitle>
                  {predictionOpen && (
                    <div className="space-y-4 rounded-md border border-[var(--border-default)] p-4">
                      <div>
                        <LabelText>PM Categories</LabelText>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          {PM_CATEGORY_OPTIONS.map((option) => (
                            <CheckButton
                              key={option.id}
                              selected={pmCategories.includes(option.id)}
                              onClick={() => setPmCategories((current) => toggleValue(current, option.id))}
                            >
                              {option.label}
                            </CheckButton>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <NumberField label="Edge Threshold" value={pmEdgeThreshold} onChange={setPmEdgeThreshold} min={0} max={50} suffix="%" />
                        <NumberField label="Max Position / Bet" value={pmMaxPositionPct} onChange={setPmMaxPositionPct} min={1} max={50} suffix="%" />
                        <NumberField label="Max PM Positions" value={pmMaxPositions} onChange={setPmMaxPositions} min={1} max={100} />
                        <NumberField label="Max Days" value={pmMaxDaysToResolution} onChange={setPmMaxDaysToResolution} min={1} max={365} />
                        <NumberField label="Min Liquidity" value={pmMinLiquidityUsd} onChange={setPmMinLiquidityUsd} min={0} max={1_000_000} prefix="$" />
                        <NumberField label="Min Bet" value={pmMinTradeUsd} onChange={setPmMinTradeUsd} min={10} max={10_000} prefix="$" />
                        <NumberField label="Max Bet" value={pmMaxTradeUsd} onChange={setPmMaxTradeUsd} min={10} max={10_000} prefix="$" />
                        <NumberField label="Stop Loss" value={pmStopLossPct} onChange={setPmStopLossPct} min={0} max={95} suffix="%" />
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <SelectField label="Price Zone" value={pmPriceZone} onChange={(value) => setPmPriceZone(value as PmPriceZone)} options={['any', 'balanced', 'cheap', 'premium', 'custom']} />
                        <SelectField label="Exit Strategy" value={pmSellStrategy} onChange={(value) => setPmSellStrategy(value as PmExitStrategy)} options={['target', 'trail', 'hold']} />
                        <SelectField label="Confidence" value={pmMinConfidence} onChange={(value) => setPmMinConfidence(value as Confidence)} options={['any', 'medium', 'high']} />
                      </div>
                      {pmPriceZone === 'custom' && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <NumberField label="Min Price" value={pmPriceMin} onChange={setPmPriceMin} min={0} max={1} step={0.01} suffix="$" />
                          <NumberField label="Max Price" value={pmPriceMax} onChange={setPmPriceMax} min={0} max={1} step={0.01} suffix="$" />
                        </div>
                      )}
                      {pmSellStrategy !== 'hold' && (
                        <div className="grid gap-3 md:grid-cols-2">
                          {pmSellStrategy === 'target' && <NumberField label="Profit Target" value={pmTargetPct} onChange={setPmTargetPct} min={5} max={1000} suffix="%" />}
                          {pmSellStrategy === 'trail' && <NumberField label="Trail Drop" value={pmTrailPct} onChange={setPmTrailPct} min={1} max={95} suffix="%" />}
                        </div>
                      )}
                      {pmCategories.includes('sports') && (
                        <div>
                          <LabelText>Sports Filter</LabelText>
                          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            {SPORTS_FILTER_OPTIONS.map((option) => (
                              <CheckButton key={option} selected={pmSportsFilter.includes(option)} onClick={() => setPmSportsFilter((current) => toggleValue(current, option))}>
                                {option.toUpperCase()}
                              </CheckButton>
                            ))}
                          </div>
                        </div>
                      )}
                      <CheckButton selected={pmDriftOnly} onClick={() => setPmDriftOnly((value) => !value)}>
                        Drift-only markets
                      </CheckButton>
                    </div>
                  )}
                </div>
              )}

              <div>
                <LabelText>Setting Presets</LabelText>
                <div className="mt-2 grid gap-2 sm:grid-cols-4">
                  <PresetButton onClick={() => applyPreset('balanced')}>Balanced</PresetButton>
                  <PresetButton onClick={() => applyPreset('sniper')}>Sniper</PresetButton>
                  <PresetButton onClick={() => applyPreset('prediction')}>Prediction</PresetButton>
                  <PresetButton onClick={() => applyPreset('hybrid')}>Hybrid</PresetButton>
                </div>
              </div>

              {formError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</div>}
              <button
                type="button"
                onClick={() => void createSpawnAgent()}
                disabled={creating || avatarUploading}
                className="btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                <Rocket size={15} />
                {creating ? 'Preparing...' : avatarUploading ? 'Uploading avatar...' : 'Prepare Spawn agent'}
              </button>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-5">
          <GlassCard className="p-5">
            <SectionHeader icon={<ClipboardList size={17} />} title="Agent Preview" />
            <div className="mt-4 rounded-md border border-[var(--border-default)] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border-default)] bg-[rgba(255,255,255,0.04)]">
                  {avatar.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar.trim()} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Rocket size={22} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{name || 'Unnamed Agent'}</div>
                  <div className="mt-1 text-xs capitalize text-[var(--text-muted)]">{tradingMode}</div>
                  {bio.trim() && <div className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{bio.trim()}</div>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <PreviewStat label="AGR" value={aggression.toFixed(2)} />
                <PreviewStat label="RISK" value={riskTolerance.toFixed(2)} />
                <PreviewStat label="PAT" value={patience.toFixed(2)} />
                <PreviewStat label="SL" value={`${stopLossPct}%`} />
                <PreviewStat label="POS" value={`${maxPositionPct}%`} />
                <PreviewStat label="SOL" value={solAmount || '0.2'} />
              </div>
              <div className="mt-4 grid gap-2 text-xs text-[var(--text-muted)]">
                <InfoRow label="Spawn Cost" value="FREE" />
                <InfoRow label="Min Deposit" value="0.2 SOL" />
                <InfoRow label="Volume Fee" value="1%" />
                <InfoRow label="Profit Fee" value="2.5% ($SPAWN buyback)" />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader icon={<Target size={17} />} title="DNA Payload" />
              <button type="button" onClick={() => void copyDna()} className="btn-secondary inline-flex items-center gap-2">
                <Copy size={14} />
                Copy
              </button>
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-md border border-[var(--border-default)] bg-[rgba(0,0,0,0.18)] p-3 text-xs text-[var(--text-muted)]">
              {formatJson(generatedDna)}
            </pre>
          </GlassCard>

        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--text-primary)]">
      <span className="text-[var(--phosphor)]">{icon}</span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function LabelText({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{children}</div>;
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.10)] text-[var(--text-primary)]'
          : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );
}

function CheckButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
        selected
          ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.10)] text-[var(--text-primary)]'
          : 'border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
      }`}
    >
      <span>{children}</span>
      {selected && <Check size={13} />}
    </button>
  );
}

function PresetButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md border border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]">
      {children}
    </button>
  );
}

function CollapsibleTitle({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-md border border-[var(--border-default)] px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)]">
      <span>{children}</span>
      <span className="text-xs text-[var(--text-muted)]">{open ? 'Hide' : 'Show'}</span>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="text-xs font-medium text-[var(--text-muted)]">
      {label}
      <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--border-default)] px-3 py-2">
        {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
        />
        {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
      </div>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="text-xs font-medium text-[var(--text-muted)] md:col-span-2">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full resize-y rounded-md border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)]"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="text-xs font-medium text-[var(--text-muted)]">
      {label}
      <div className="mt-1 flex items-center gap-2 rounded-md border border-[var(--border-default)] px-3 py-2">
        {prefix && <span className="text-xs text-[var(--text-muted)]">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
        />
        {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
      </div>
    </label>
  );
}

function RangeControl({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="text-xs font-medium text-[var(--text-muted)]">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-[var(--text-primary)]">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="text-xs font-medium text-[var(--text-muted)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-primary)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
  onCopy,
}: {
  label: string;
  value: string;
  copyValue?: string;
  onCopy?: (value: string) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-[var(--text-primary)]">
        <span className="truncate">{value}</span>
        {copyValue && onCopy && (
          <button type="button" onClick={() => void onCopy(copyValue)} className="text-[var(--accent)]">
            <Copy size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border-default)] px-2 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 font-mono text-xs text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
