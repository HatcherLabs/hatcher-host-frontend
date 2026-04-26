// components/landing/v3/parts/SectionCity.tsx
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import { LiveCityCounter } from '../shared/LiveCityCounter';
import styles from './SectionCity.module.css';

/**
 * Hatcher City section. Background is an SVG aerial mockup of the 25-tile
 * district grid (a real screenshot of /city is captured in Phase F follow-up
 * and dropped at /landing-v3/city-snapshot.png — when present, the <Image>
 * tag below replaces this SVG; until then the SVG provides a faithful
 * "what does the city look like" preview without leaking PII).
 *
 * Real data: "25 categories" comes from world/grid.ts (5×5 grid).
 * LiveCityCounter pulls from /agents/snapshot at runtime, hidden if <10.
 */
export function SectionCity() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>Hatcher City</BoxLabel>
          <h2 className={styles.title}>The network of agents, walkable</h2>
        </header>

        <div className={styles.shot}>
          <CityMockup />
        </div>

        <div className={styles.belowShot}>
          <p className={styles.body}>
            Walk through 25 categories of agents. Each building is a live agent — visit, watch, follow.
          </p>
          <div className={styles.actions}>
            <PhosphorButton href="/city">Enter Hatcher City</PhosphorButton>
            <LiveCityCounter />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 5×5 SVG aerial of district pads. Phosphor outlines + dark fills, no fake
 * data. Only structure: 25 tiles, hatched roads, sky vignette. Replaces
 * cleanly with the real /city PNG once captured.
 */
function CityMockup() {
  const tiles = Array.from({ length: 25 }, (_, i) => i);
  return (
    <svg viewBox="0 0 1200 600" className={styles.svg} role="img" aria-label="Hatcher City — 5×5 district grid mockup">
      <defs>
        <linearGradient id="city-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F1A12" />
          <stop offset="60%" stopColor="#050505" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <linearGradient id="city-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1A0E" />
          <stop offset="100%" stopColor="#050E08" />
        </linearGradient>
      </defs>
      <rect width="1200" height="600" fill="url(#city-sky)" />
      {/* Horizon */}
      <line x1="0" y1="180" x2="1200" y2="180" stroke="#1F1F1F" strokeWidth="1" />
      {/* Distant skyline silhouette */}
      <g fill="#0A0A0A">
        {Array.from({ length: 26 }).map((_, i) => {
          const h = 30 + ((i * 17) % 30);
          return <rect key={i} x={i * 48} y={180 - h} width="36" height={h} />;
        })}
      </g>
      {/* Grid */}
      <g transform="translate(140 220)">
        {tiles.map((i) => {
          const col = i % 5;
          const row = Math.floor(i / 5);
          const x = col * 184;
          const y = row * 70;
          // Apply skew to hint at perspective
          return (
            <g key={i} transform={`translate(${x + (row * 6)} ${y})`}>
              <rect width="170" height="60" rx="3" fill="url(#city-tile)" stroke="#39FF88" strokeOpacity="0.55" strokeWidth="1" />
              {/* Building dot */}
              <circle cx={20 + (i * 11) % 130} cy="30" r="3" fill="#39FF88" opacity={(i % 4 === 0) ? 0.9 : 0.4} />
            </g>
          );
        })}
      </g>
      {/* Hatched roads — subtle */}
      <g stroke="#1F1F1F" strokeWidth="0.5">
        <line x1="0" y1="280" x2="1200" y2="280" />
        <line x1="0" y1="350" x2="1200" y2="350" />
        <line x1="0" y1="420" x2="1200" y2="420" />
        <line x1="0" y1="490" x2="1200" y2="490" />
      </g>
      {/* HUD label */}
      <g fontFamily="JetBrains Mono, monospace" fill="#A0A0A0">
        <text x="20" y="32" fontSize="11">/city</text>
        <text x="1180" y="32" fontSize="10" textAnchor="end" fill="#39FF88">25 districts · grid 5×5</text>
      </g>
    </svg>
  );
}
