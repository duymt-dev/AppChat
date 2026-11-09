// Modal "Kiểm tra trùng lặp" — prototype L2626–2682 (880px). TIP-015e: orchestrator — useDedupe đọc ứng viên thật theo scope (hạng LUẬT,
// không %), DedupeGroup hiển thị từng cặp (chọn cặp + bản chính). Tìm không ra → trạng thái rỗng thật (bỏ regex giả NO_MATCH). "Hợp nhất
// đã chọn" chỉ gửi cặp đã chọn. Ô "AI GỢI Ý" → mở Trợ lý (AI giải thích từ ứng viên thật — không tự gộp theo ngưỡng).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useDedupeStyles } from '../styles/dedupe.styles';
import { useFormStyles } from '../styles/form.styles';
import { useCrmUi } from '../crm-store';
import { useDedupe } from '../hooks/useDedupe';
import { DedupeGroup } from './dedupe/DedupeGroup';

export function DedupeModal() {
  const t = useTranslations('customers.dd');
  const { styles, cx } = useDedupeStyles();
  const { styles: fs } = useFormStyles();
  const ui = useCrmUi();
  const d = useDedupe();
  const close = () => ui.set({ modal: null });
  const records = new Set(d.rows.flatMap((c) => [c.a.id, c.b.id])).size;
  const strong = d.rows.filter((c) => c.rank >= 3).length;
  const empty = !d.loading && !d.error && d.rows.length === 0;

  return (
    <ModalShell
      open
      onClose={close}
      width={880}
      title={t('title')}
      icon="ic-filter"
      iconColor={color.dangerDeep}
      iconBg={color.dangerSoftBg}
      closeLabel={t('close')}
      testId="crm-dedupe-modal"
      footer={
        <>
          <button type="button" className={cx(fs.btn, fs.btnFoot)} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(fs.btn, fs.btnFoot, fs.primary)} disabled={!d.picked.size || d.pending} onClick={() => void d.mergePicked()} data-testid="dd-merge-picked">
            {d.picked.size ? t('mergeSelectedN', { n: d.picked.size }) : t('mergeSelected')}
          </button>
        </>
      }
    >
      <div className={styles.search}>
        <Icon name="ic-search" size={15} color={color.text4} strokeWidth={1.9} />
        <input className={styles.searchInput} value={d.draft} placeholder={t('search')} aria-label={t('search')} onChange={(e) => d.setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && d.search()} />
        <button type="button" className={styles.run} onClick={d.search}>
          {t('run')}
        </button>
      </div>
      {empty && d.q ? (
        <div className={styles.none} data-testid="dd-no-match">
          <span className={styles.noneIcon}>
            <Icon name="ic-search" size={20} color={color.amberGold} strokeWidth={1.7} />
          </span>
          <div className={styles.noneTitle}>{t('noMatch')}</div>
          <div className={styles.noneBody}>{t.rich('noMatchBody', { q: d.q, b: (c) => <b>{c}</b> })}</div>
          <div className={styles.noneActs}>
            <button type="button" className={fs.btn} onClick={close}>
              {t('later')}
            </button>
            <button type="button" className={cx(fs.btn, fs.primary)} onClick={() => ui.open('ai')}>
              <Icon name="ic-spark" size={14} color={color.white} strokeWidth={1.9} />
              {t('createAi')}
            </button>
          </div>
        </div>
      ) : null}
      <div className={styles.summary}>
        <div className={styles.sum} style={{ background: color.dupBg, borderColor: color.dupLine }}>
          <div className={styles.sumLabel} style={{ color: color.dangerDeep }}>
            {t('suspect')}
          </div>
          <div className={styles.sumBig}>{t('suspectVal', { groups: d.rows.length, records })}</div>
        </div>
        <div className={styles.sum} style={{ background: color.ruleBg, borderColor: color.ruleLine }}>
          <div className={styles.sumLabel} style={{ color: color.blue }}>
            {t('rules')}
          </div>
          <div className={styles.sumText}>{t('rulesVal')}</div>
        </div>
        <button type="button" className={styles.sum} style={{ background: color.brandBg, borderColor: color.brandBorder, textAlign: 'left' }} onClick={() => ui.open('ai')}>
          <div className={styles.sumLabel} style={{ color: color.brandInk }}>
            {t('aiSuggest')}
          </div>
          <div className={styles.sumText}>{t('aiSuggestVal', { auto: strong, groups: d.rows.length })}</div>
        </button>
      </div>
      {d.conflict ? (
        <div className={styles.noneBody} role="alert" data-testid="dd-conflict">
          {t('conflict')}
        </div>
      ) : null}
      {d.error ? (
        <div className={styles.noneBody} role="alert">
          {t('loadError')}
        </div>
      ) : null}
      {d.rows.map((c) => (
        <DedupeGroup
          key={c.key}
          c={c}
          picked={d.picked.has(c.key)}
          primary={d.primaryOf(c)}
          busy={d.pending}
          onPick={() => d.toggle(c.key)}
          onPrimary={(id) => d.choosePrimary(c.key, id)}
          onMerge={() => void d.mergeOne(c.key)}
        />
      ))}
      {d.more ? (
        <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={d.loadMore} data-testid="dd-more">
          {t('more')}
        </button>
      ) : null}
    </ModalShell>
  );
}
