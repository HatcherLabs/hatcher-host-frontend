// components/landing/v3/shared/TerminalMockup.tsx
import styles from './TerminalMockup.module.css';

/**
 * Static SVG-style terminal mockup of a chat-to-hatch session ending in a
 * live agent. Hardcoded prompts/output reproduce the real chat-to-hatch
 * flow without leaking any user data. No animation other than the cursor
 * blink (motion-reduced respected).
 */
export function TerminalMockup() {
  return (
    <div className={styles.term} aria-label="Example chat-to-hatch session">
      <div className={styles.head}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.title}>chat-to-hatch · session</span>
      </div>
      <div className={styles.body}>
        <div className={styles.line}>
          <span className={styles.prompt}>$</span> hatcher hatch --from-chat
        </div>
        <div className={styles.line}>
          <span className={styles.user}>&gt;</span> I want a content summarizer for crypto news
        </div>
        <div className={styles.spacer} />
        <div className={styles.lineMuted}>parsing intent...</div>
        <div className={styles.lineMuted}>framework: <span className={styles.value}>hermes</span></div>
        <div className={styles.lineMuted}>provider: <span className={styles.value}>openrouter</span></div>
        <div className={styles.lineMuted}>model: <span className={styles.value}>deepseek-v4-flash</span></div>
        <div className={styles.lineMuted}>tools: <span className={styles.value}>web_search, memory</span></div>
        <div className={styles.spacer} />
        <div className={styles.lineSuccess}>
          <span className={styles.check}>✓</span> agent live
          <span className={styles.cursor} aria-hidden>▎</span>
        </div>
        <div className={styles.lineLink}>enter room →</div>
      </div>
    </div>
  );
}
