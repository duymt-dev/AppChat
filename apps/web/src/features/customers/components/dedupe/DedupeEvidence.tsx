// Nhãn hạng luật + bằng chứng khớp của một cặp trùng (TIP-015e §1.3): "Luật mạnh / vừa / yếu" theo hạng, KHÔNG phải % xác suất AI.
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import type { DuplicateCandidate } from '@appchat/shared';
import { useDedupeStyles } from '../../styles/dedupe.styles';

const TONE: Record<number, [string, string]> = { 4: [color.roseBg, color.dangerDeep], 3: [color.roseBg, color.dangerDeep], 2: [color.tierSoftBg, color.amberText], 1: [color.lookupBg, color.violetInk] };

export function DedupeEvidence({ c }: { c: DuplicateCandidate }) {
  const t = useTranslations('customers.dd');
  const { styles } = useDedupeStyles();
  const [bg, fg] = TONE[c.rank] ?? TONE[1]!;
  return (
    <>
      <span className={styles.pct} style={{ background: bg, color: fg }} data-testid="dd-rank">
        {t(`rank.${c.rank >= 3 ? 'strong' : c.rank === 2 ? 'medium' : 'weak'}`)}
      </span>
      <span className={styles.by}>
        {t('by')} <b>{c.evidence.map((e) => t(`ev.${e}`)).join(' · ')}</b>
      </span>
    </>
  );
}
