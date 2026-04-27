// components/landing/v3/parts/SectionRooms.tsx
import { BoxLabel } from '../shared/BoxLabel';
import styles from './SectionRooms.module.css';

const FRAMEWORKS = [
  { key: 'openclaw', label: 'OpenClaw', color: '#FFCC00' },
  { key: 'hermes',   label: 'Hermes',   color: '#A855F7' },
  { key: 'elizaos',  label: 'ElizaOS',  color: '#3B82F6' },
  { key: 'milady',   label: 'Milady',   color: '#EC4899' },
] as const;

export function SectionRooms() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>Agent Rooms</BoxLabel>
          <h2 className={styles.title}>Every agent has a 3D cockpit</h2>
        </header>

        <div className={styles.layout}>
          <div className={styles.mockupWrap}>
            <RoomMockup />
          </div>
          <div className={styles.copy}>
            <p className={styles.body}>
              Walk into the room. See your agent&apos;s status, skills, memory, and live
              logs in a navigable 3D cockpit. One per agent.
            </p>
            <ul className={styles.stations}>
              <li>Avatar</li>
              <li>Skill Workbench</li>
              <li>Integrations Rack</li>
              <li>Status Console</li>
              <li>Log Wall</li>
              <li>Stats Hologram</li>
              <li>Memory Shelves</li>
              <li>Config Terminal</li>
            </ul>
            <div className={styles.chips}>
              {FRAMEWORKS.map((f) => (
                <span key={f.key} className={styles.chip} style={{ borderColor: f.color, color: f.color }}>
                  ● {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * SVG mockup of a generic agent room. Reproduces real UI structure (8
 * stations + framework chip + walkable POV indicator) without exposing
 * any live state or PII.
 */
function RoomMockup() {
  return (
    <svg viewBox="0 0 600 380" className={styles.svg} role="img" aria-label="Agent Room mockup with 8 interactive stations">
      <rect x="0" y="0" width="600" height="380" rx="8" fill="#050505" stroke="#2A2A2A" />
      <g stroke="#1F1F1F" strokeWidth="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 32 + 60} x2="600" y2={i * 32 + 60} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 36} y1="60" x2={i * 36} y2="380" />
        ))}
      </g>
      <g fill="#131313" stroke="#39FF88" strokeWidth="1">
        <rect x="40"  y="100" width="100" height="60"  rx="4" />
        <rect x="40"  y="180" width="100" height="60"  rx="4" />
        <rect x="40"  y="260" width="100" height="60"  rx="4" />
        <rect x="460" y="100" width="100" height="60"  rx="4" />
        <rect x="460" y="180" width="100" height="60"  rx="4" />
        <rect x="460" y="260" width="100" height="60"  rx="4" />
        <rect x="180" y="80"  width="120" height="50"  rx="4" />
        <rect x="320" y="80"  width="120" height="50"  rx="4" />
      </g>
      <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#A0A0A0">
        <text x="90"  y="135" textAnchor="middle">AVATAR</text>
        <text x="90"  y="215" textAnchor="middle">SKILLS</text>
        <text x="90"  y="295" textAnchor="middle">INTEGRATIONS</text>
        <text x="510" y="135" textAnchor="middle">STATUS</text>
        <text x="510" y="215" textAnchor="middle">LOGS</text>
        <text x="510" y="295" textAnchor="middle">STATS</text>
        <text x="240" y="110" textAnchor="middle">MEMORY</text>
        <text x="380" y="110" textAnchor="middle">CONFIG</text>
      </g>
      <g>
        <circle cx="300" cy="240" r="6" fill="#39FF88" />
        <circle cx="300" cy="240" r="14" fill="none" stroke="#39FF88" strokeWidth="0.8" opacity="0.5" />
        <text x="300" y="264" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#39FF88">YOU</text>
      </g>
      <rect x="0" y="0" width="600" height="40" fill="#0F0F0F" />
      <text x="20" y="26" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#A0A0A0">/agent/sample-room/room</text>
      <circle cx="570" cy="20" r="4" fill="#39FF88" />
      <text x="556" y="25" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#39FF88">LIVE</text>
    </svg>
  );
}
