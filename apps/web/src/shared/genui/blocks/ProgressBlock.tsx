// Khối `progress`: value / max từ `$ref` (max vắng = phần trăm 0–100); thanh màu theo tone.
'use client';
import { useFmt } from '../../i18n/useFmt';
import { useGenUi } from '../context';
import { TONE, useGenUiStyles } from '../genui.styles';
import { isUnavailable, type BlockOf, type BlockProps } from '../types';
import { NoData } from './NoData';

export function ProgressBlock({ block }: BlockProps<BlockOf<'progress'>>) {
  const { styles } = useGenUiStyles();
  const { ref } = useGenUi();
  const fmt = useFmt();
  const v = Number(ref(block.value));
  const rawMax = block.max ? ref(block.max) : 100;
  const max = Number(rawMax);
  const bad = isUnavailable(ref(block.value)) || isUnavailable(rawMax) || !Number.isFinite(v) || !Number.isFinite(max) || max <= 0;
  const pct = bad ? 0 : Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div data-testid="genui-progress">
      <div className={styles.progressHead}>
        <span>{block.label}</span>
        {bad ? null : <span>{block.max ? `${fmt.number(v)} / ${fmt.number(max)}` : `${fmt.number(Math.round(pct))}%`}</span>}
      </div>
      {bad ? (
        <NoData />
      ) : (
        <div className={styles.progressTrack} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${pct}%`, height: '100%', background: TONE[block.tone ?? 'brand'].fg }} />
        </div>
      )}
    </div>
  );
}
