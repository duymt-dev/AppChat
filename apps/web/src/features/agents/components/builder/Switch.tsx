// Công tắc 42×24 của builder (prototype L2368) — vùng chạm 44px trên mobile.
'use client';
import { color } from '@appchat/ui';
import { useSectionStyles } from '../../styles/sections.styles';

export function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  const { styles } = useSectionStyles();
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={styles.swHit} onClick={onToggle}>
      <span className={styles.sw} style={{ background: on ? color.brand : color.border }}>
        <span style={{ left: on ? 20 : 2 }} />
      </span>
    </button>
  );
}
