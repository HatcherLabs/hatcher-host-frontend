// components/landing/v3/shared/PromptLine.tsx
import styles from './PromptLine.module.css';

interface Props {
  children: string;
  prompt?: string;
}

/**
 * Renders a `$ command` styled line. Used in hero mockup, demo tiles,
 * footer line.
 */
export function PromptLine({ children, prompt = '$' }: Props) {
  return (
    <div className={styles.line}>
      <span className={styles.prompt} aria-hidden>{prompt}</span>
      <span className={styles.cmd}>{children}</span>
    </div>
  );
}
