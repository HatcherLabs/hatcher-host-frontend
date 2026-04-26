// components/landing/v3/parts/SectionFlow.tsx
import { BoxLabel } from '../shared/BoxLabel';
import { PhosphorButton } from '../shared/PhosphorButton';
import styles from './SectionFlow.module.css';

/**
 * Three-step flow: type, review, live. Tile 1 uses CSS-only typed-out
 * animation. Tiles 2 + 3 are static SVG mockups (the real GIF assets
 * captured in Phase F follow-up replace these without any other change).
 */
export function SectionFlow() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <BoxLabel>How it works</BoxLabel>
          <h2 className={styles.title}>Three steps from idea to live agent</h2>
        </header>

        <ol className={styles.tiles}>
          <li className={styles.tile}>
            <span className={styles.step}>01</span>
            <div className={styles.tileVisual}>
              <div className={styles.typed}>
                <span className={styles.typedPrompt}>&gt;</span>
                <span className={styles.typedText}>summarize crypto news daily</span>
                <span className={styles.typedCursor} aria-hidden>▎</span>
              </div>
            </div>
            <h3 className={styles.tileTitle}>Type what you want</h3>
            <p className={styles.tileBody}>
              Plain English. Tell the chat what your agent should do — no YAML, no flags.
            </p>
          </li>

          <li className={styles.tile}>
            <span className={styles.step}>02</span>
            <div className={styles.tileVisual}>
              <ConfigMockup />
            </div>
            <h3 className={styles.tileTitle}>Review the config</h3>
            <p className={styles.tileBody}>
              Framework, model, tools, integrations — Hatcher proposes; you confirm or tweak.
            </p>
          </li>

          <li className={styles.tile}>
            <span className={styles.step}>03</span>
            <div className={styles.tileVisual}>
              <LiveMockup />
            </div>
            <h3 className={styles.tileTitle}>
              Live agent <span className={styles.check}>✓</span>
            </h3>
            <p className={styles.tileBody}>
              Agent runs in its 3D room. Integrations wired. Walk in and watch.
            </p>
          </li>
        </ol>

        <div className={styles.ctaRow}>
          <PhosphorButton href="/chat-to-hatch">Hatch yours</PhosphorButton>
        </div>
      </div>
    </section>
  );
}

function ConfigMockup() {
  return (
    <div className={styles.mockup}>
      <div className={styles.mockRow}><span className={styles.mockKey}>framework</span><span className={styles.mockVal}>hermes</span></div>
      <div className={styles.mockRow}><span className={styles.mockKey}>model</span><span className={styles.mockVal}>llama-4-scout</span></div>
      <div className={styles.mockRow}><span className={styles.mockKey}>tools</span><span className={styles.mockVal}>brave_search, telegram</span></div>
      <div className={styles.mockRow}><span className={styles.mockKey}>schedule</span><span className={styles.mockVal}>0 9 * * *</span></div>
    </div>
  );
}

function LiveMockup() {
  return (
    <div className={styles.mockup}>
      <div className={styles.liveRow}>
        <span className={styles.livePip} aria-hidden />
        <span className={styles.liveText}>agent live</span>
      </div>
      <div className={styles.mockRow}><span className={styles.mockKey}>room</span><span className={styles.mockVal}>3d cockpit ready</span></div>
      <div className={styles.mockRow}><span className={styles.mockKey}>integrations</span><span className={styles.mockVal}>connected</span></div>
      <div className={styles.mockRow}><span className={styles.mockKey}>chat</span><span className={styles.mockVal}>open →</span></div>
    </div>
  );
}
