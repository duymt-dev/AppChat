// Khối `stat`: số từ `$ref` (không do model viết), định dạng theo `format`; `compare` (ref) hiện kèm, dương → success, âm → danger.
'use client';
import type { Fmt, ValueFormat } from '@appchat/shared';
import { useFmt } from '../../i18n/useFmt';
import { useGenUi } from '../context';
import { formatValue } from '../format';
import { TONE, useGenUiStyles } from '../genui.styles';
import { isUnavailable, type BlockOf, type BlockProps } from '../types';
import { NoData } from './NoData';

/** "+12" / "-3" / "+1.200.000₫" — tiền giữ định dạng tiền, còn lại là số. */
const compareText = (fmt: Fmt, v: unknown, n: number, f?: ValueFormat) => `${Number.isFinite(n) && n > 0 ? '+' : ''}${formatValue(fmt, v, f === 'money' ? 'money' : 'number')}`;

export function StatBlock({ block }: BlockProps<BlockOf<'stat'>>) {
  const { styles } = useGenUiStyles();
  const { ref } = useGenUi();
  const fmt = useFmt();
  const v = ref(block.value);
  const cmp = block.compare ? ref(block.compare) : undefined;
  const n = typeof cmp === 'number' ? cmp : Number(cmp);
  const cmpTone = Number.isFinite(n) && n !== 0 ? TONE[n > 0 ? 'success' : 'danger'].fg : TONE.default.fg;
  return (
    <div className={styles.stat} data-testid="genui-stat">
      <span className={styles.statLabel}>{block.label}</span>
      {isUnavailable(v) ? (
        <NoData />
      ) : (
        <span className={styles.statValue} style={block.tone && block.tone !== 'default' ? { color: TONE[block.tone].fg } : undefined}>
          {formatValue(fmt, v, block.format)}
        </span>
      )}
      {block.compare && !isUnavailable(cmp) ? (
        <span className={styles.statCompare} style={{ color: cmpTone }}>
          {compareText(fmt, cmp, n, block.format)}
        </span>
      ) : null}
    </div>
  );
}
