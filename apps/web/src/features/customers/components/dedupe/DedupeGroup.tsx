// Một cặp khách trùng (TIP-015e §1.3): ô chọn cặp (cho "Hợp nhất đã chọn"), chọn bản chính bằng radio thật (mặc định khách tạo trước),
// lối tắt tạo lịch hẹn / ticket / điều chuyển cho bản chính, "Gộp khách hàng" chỉ cặp này.
'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { DuplicateCandidate } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { useDedupeStyles } from '../../styles/dedupe.styles';
import { useFormStyles } from '../../styles/form.styles';
import { useCrmUi } from '../../crm-store';
import { DedupeEvidence } from './DedupeEvidence';

type Props = { c: DuplicateCandidate; picked: boolean; primary: string; busy: boolean; onPick: () => void; onPrimary: (id: string) => void; onMerge: () => void };

export function DedupeGroup({ c, picked, primary, busy, onPick, onPrimary, onMerge }: Props) {
  const t = useTranslations('customers.dd');
  const ts = useTranslations('customers.source');
  const router = useRouter();
  const fmt = useFmt();
  const ui = useCrmUi();
  const { styles, cx } = useDedupeStyles();
  const { styles: fs } = useFormStyles();
  const side = (s: DuplicateCandidate['a']) => {
    const on = s.id === primary;
    return (
      <label key={s.id} className={cx(styles.rec, on && styles.recLine)} data-testid={`dd-side-${s.id}`}>
        <span className={styles.recName}>
          <input type="radio" name={`p-${c.key}`} className={cx(styles.radio, on && styles.radioOn)} checked={on} onChange={() => onPrimary(s.id)} aria-label={t('primary', { name: s.name })} />
          {s.name}
        </span>
        <span className={styles.email}>{s.email ?? '—'}</span>
        <span className={styles.phone}>{s.phone ?? '—'}</span>
        <span className={styles.src}>{`${ts.has(s.source) ? ts(s.source) : s.source} · ${fmt.date(s.created_at).slice(0, 5)}`}</span>
      </label>
    );
  };
  return (
    <div className={styles.group} data-testid="dd-group" data-key={c.key}>
      <div className={styles.groupHead}>
        <input type="checkbox" checked={picked} onChange={onPick} aria-label={t('pick')} data-testid="dd-pick" />
        <DedupeEvidence c={c} />
        <span className={styles.grow} />
        <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => router.push(`/calendar?contact=${primary}`)}>
          {t('booking')}
        </button>
        <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => router.push(`/tickets?contact=${primary}`)}>
          {t('ticket')}
        </button>
        <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => ui.open('transfer', primary)}>
          {t('transfer')}
        </button>
        <button type="button" className={cx(fs.btn, fs.btnSm, fs.primary)} disabled={busy} onClick={onMerge}>
          {t('merge')}
        </button>
      </div>
      {side(c.a)}
      {side(c.b)}
    </div>
  );
}
