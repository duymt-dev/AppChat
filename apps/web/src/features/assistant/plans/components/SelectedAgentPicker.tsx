// Chọn agent Cowork (TIP-023d §5.1, §6.3) — danh sách phân trang từ agent_choices (chỉ agent đang chạy + đã xuất bản, theo UUID; trùng tên
// vẫn phân biệt bằng vai trò ở tooltip / mô tả trợ năng — một dòng như prototype L1199). "Không chọn" = Trợ lý tự điều phối. Mức AI là mức
// cấu hình của agent (nhãn, không tên model — D29).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../../styles/composer.styles';
import { useSelectedAgent } from '../hooks/useSelectedAgent';

export function SelectedAgentPicker() {
  const t = useTranslations('assistant');
  const { styles } = useComposerStyles();
  const a = useSelectedAgent();
  return (
    <>
      <div className={styles.popHead}>{t('agentPick')}</div>
      <button type="button" role="menuitemradio" aria-checked={!a.selected} className={styles.popRow} data-testid="asst-agent-none" onClick={a.clear}>
        <span className={styles.popLabel}>{t('agentNone')}</span>
        <span className={styles.check}>{!a.selected ? t('tier.check') : ''}</span>
      </button>
      {a.loading ? <div className={styles.popRow}>{t('plan.loading')}</div> : null}
      {a.error ? <div className={styles.popRow} role="alert">{t('plan.agentsError')}</div> : null}
      {!a.loading && !a.error && !a.choices.length ? <div className={styles.popRow}>{t('plan.agentsEmpty')}</div> : null}
      {a.choices.map((c) => (
        <button
          key={c.id}
          type="button"
          role="menuitemradio"
          aria-checked={a.selected?.id === c.id}
          aria-description={`${c.role_label || c.role} · ${t(`tier.${c.model_tier}`)}`}
          title={`${c.role_label || c.role} · ${t(`tier.${c.model_tier}`)}`}
          className={styles.popRow}
          data-testid="asst-agent-choice"
          data-tier={c.model_tier}
          onClick={() => a.pick(c)}
        >
          <Icon name="ic-bot" size={15} color={color.violet} strokeWidth={1.9} />
          <span className={styles.popLabel}>{t('agentSuffix', { name: c.name })}</span>
          <span className={styles.check}>{a.selected?.id === c.id ? t('tier.check') : ''}</span>
        </button>
      ))}
      {a.more ? (
        <button type="button" className={styles.popRow} onClick={a.more}>
          {t('plan.more')}
        </button>
      ) : null}
    </>
  );
}
