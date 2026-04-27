// components/landing/v3/shared/BoxLabel.tsx
import styles from './BoxLabel.module.css';

interface Props {
  children: string;
  as?: 'div' | 'span';
}

/**
 * Renders a box-drawing chrome around a label, e.g. ┌─ DEPLOY ─┐.
 * Glyphs are aria-hidden — screen readers see only the inner text.
 */
export function BoxLabel({ children, as: Tag = 'div' }: Props) {
  return (
    <Tag className={styles.label}>
      <span className={styles.bracket} aria-hidden>┌─ </span>
      <span className={styles.text}>{children}</span>
      <span className={styles.bracket} aria-hidden> ─┐</span>
    </Tag>
  );
}
