// Điều khoản AI gợi ý của hợp đồng nháp (TIP-030b spec 11, 19): mỗi khối Giữ / Bỏ (`contract.resolve_suggestion`, CAS theo version — người
// khác vừa xử lý → báo xung đột, không ghi đè); còn khối chờ thì nút Trình duyệt bị server chặn, ở đây hiện số còn chờ. Khối đã xử lý hiện
// trạng thái; chữ luôn là chữ thuần.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { useAction } from '@/shared/actions/useAction';
import { useDraftStyles } from '../../styles/draft.styles';
import { useContractTabStyles } from '../../styles/tabs.styles';
import type { Contract } from '../../types';

export function AiSuggestions({ c }: { c: Contract }) {
  const t = useTranslations('contracts.draft');
  const { message } = App.useApp();
  const { styles, cx } = useDraftStyles();
  const { styles: tab } = useContractTabStyles();
  const can = useCan('contract.draft');
  const resolve = useAction('contract.resolve_suggestion');
  const list = c.ai_suggestions ?? [];
  if (!list.length) return null;
  const pending = list.filter((s) => s.status === 'pending').length;
  const decide = (id: string, decision: 'keep' | 'discard', version: number) =>
    resolve.run(
      { contract_id: c.id, suggestion_id: id, decision, if_version: version },
      { onError: (e) => (e.error.code === 'CONFLICT' ? (void message.warning(t('conflict')), true) : false) },
    );
  return (
    <div className={tab.card} data-testid="ct-ai-suggestions">
      <div className={tab.h}>
        {t('sTitle')}
        {pending ? <span className={styles.hint}> · {t('pending', { n: pending })}</span> : null}
      </div>
      {list.map((s) => (
        <div key={s.id} className={styles.sug} data-testid={`ct-sug-${s.id}`}>
          <span>
            <span className={styles.tag}>{t('aiTag')}</span>
            {s.text}
          </span>
          {s.status === 'pending' && can && c.status === 'draft' ? (
            <span className={cx(styles.row, styles.flush)}>
              <button type="button" className={cx(styles.btn, styles.primary)} disabled={resolve.isPending} onClick={() => void decide(s.id, 'keep', s.version)} data-testid={`ct-sug-keep-${s.id}`}>
                {t('keep')}
              </button>
              <button type="button" className={styles.btn} disabled={resolve.isPending} onClick={() => void decide(s.id, 'discard', s.version)} data-testid={`ct-sug-discard-${s.id}`}>
                {t('discard')}
              </button>
            </span>
          ) : (
            <span className={styles.done} data-testid={`ct-sug-state-${s.id}`}>
              {t(`state.${s.status}`)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
