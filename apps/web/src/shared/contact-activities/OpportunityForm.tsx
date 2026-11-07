// Form cơ hội (TIP-026b §3.4–3.5) — tạo / sửa / chốt thắng-thua / lưu trữ. Giá trị KỲ VỌNG (không phải doanh thu), xác suất do người nhập.
// Không có quote.create → ô tiền khoá (server cũng 403). CTA "Tạo báo giá" chỉ mở form báo giá với khách + tên / nhu cầu người dùng đã nhập;
// giá trị kỳ vọng KHÔNG thành đơn giá / chiết khấu. won / lost không đổi giai đoạn khách hay đơn.
'use client';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { CONTACT_OPPORTUNITY_STAGES, OPPORTUNITY_AMOUNT_RE, probabilityOk, type OpportunityItemDto } from '@appchat/shared';
import { useAction } from '../actions/useAction';
import { useCan } from '../authz/useCan';
import { dispatchUiCommand } from '../assistant/ui-command-bus';
import { useEmailComposeStyles } from '../crm-forms/email-compose.styles';
import type { ActivityFormTarget } from './activity-store';
import { useActivityRow, useFormFrame } from './useActivityForm';
import { useActivityStyles } from './activity.styles';

type Draft = { title: string; need: string; amount: string; stage: OpportunityItemDto['stage']; probability: string; close: string };
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function OpportunityForm({ target }: { target: ActivityFormTarget }) {
  const row = useActivityRow<OpportunityItemDto>(target.contactId, 'opportunities', target.editId);
  if (target.editId && !row.data) return null;
  const r = row.data;
  const v = target.values ?? {};
  const initial: Draft = {
    title: r?.title ?? str(v.title),
    need: r?.need ?? str(v.need),
    amount: r ? (r.amount_vnd ?? '') : str(v.amount_vnd),
    stage: r?.stage ?? 'open',
    probability: r?.probability != null ? String(r.probability) : typeof v.probability === 'number' ? String(v.probability) : '',
    close: r?.expected_close_date ?? str(v.expected_close_date),
  };
  return <OpportunityFormBody key={`${r?.id ?? 'new'}:${r?.version ?? 0}`} target={target} row={r} initial={initial} />;
}

const fieldsOf = (d: Draft) => ({
  title: d.title.trim(),
  need: d.need,
  amount_vnd: d.amount.trim() || null,
  stage: d.stage,
  probability: d.probability.trim() === '' ? null : Number(d.probability),
  expected_close_date: d.close || null,
});

function OpportunityFormBody({ target, row, initial }: { target: ActivityFormTarget; row?: OpportunityItemDto; initial: Draft }) {
  const t = useTranslations('common.activities');
  const { styles, cx } = useEmailComposeStyles();
  const { styles: as } = useActivityStyles();
  const canMoney = useCan('quote.create');
  const f = useFormFrame(initial);
  const create = useAction('contact_opportunity.create');
  const update = useAction('contact_opportunity.update');
  const archive = useAction('contact_opportunity.archive');
  const d = f.draft;
  const amountOk = !d.amount.trim() || OPPORTUNITY_AMOUNT_RE.test(d.amount.trim());
  const probOk = d.probability.trim() === '' || probabilityOk(Number(d.probability));
  const valid = !!d.title.trim() && amountOk && probOk;
  const hidden = !!row?.amount_hidden;
  const stages = row ? CONTACT_OPPORTUNITY_STAGES : CONTACT_OPPORTUNITY_STAGES.filter((s) => s !== 'won' && s !== 'lost');
  const save = async () => {
    if (!valid) return;
    const next = fieldsOf(d) as Record<string, unknown>;
    // Ô tiền chỉ gửi khi được ghi và đã đổi — không gửi tiền ẩn / không quyền.
    if (!canMoney || hidden) delete next.amount_vnd;
    if (!row) {
      const res = await create.run({ contact_id: target.contactId, ...Object.fromEntries(Object.entries(next).filter(([, val]) => val !== null && val !== '')) });
      if (res) f.done();
      return;
    }
    const prev = fieldsOf(initial) as Record<string, unknown>;
    const patch = Object.fromEntries(Object.entries(next).filter(([k, val]) => val !== prev[k]));
    if (!Object.keys(patch).length) return f.done();
    const res = await update.run({ opportunity_id: row.id, if_version: row.version, patch }, { onError: f.onError });
    if (res) f.done();
  };
  const doArchive = async () => {
    if (!row || !window.confirm(t('form.archiveConfirm'))) return;
    const res = await archive.run({ opportunity_id: row.id, if_version: row.version }, { onError: f.onError });
    if (res) f.done();
  };
  const toQuote = () => {
    f.done();
    dispatchUiCommand({ type: 'prefill', form: 'quote.form', values: { contact_id: target.contactId, note: [d.title.trim(), d.need.trim()].filter(Boolean).join(' — ') } });
  };
  const busy = create.isPending || update.isPending || archive.isPending;
  return (
    <ModalShell
      open
      onClose={f.close}
      width={560}
      title={t(row ? 'form.oppEditTitle' : 'form.oppTitle')}
      icon="ic-trend"
      iconColor={color.dealText}
      iconBg={color.dealBg}
      closeLabel={t('form.cancel')}
      testId="activity-opp-form"
      footer={
        <>
          {row ? (
            <button type="button" className={styles.btn} onClick={() => void doArchive()} disabled={busy} data-testid="opp-archive">
              {t('form.archive')}
            </button>
          ) : null}
          {canMoney ? (
            <button type="button" className={styles.btn} onClick={toQuote} disabled={!d.title.trim()} data-testid="opp-to-quote">
              {t('form.toQuote')}
            </button>
          ) : null}
          <button type="button" className={cx(styles.btn, styles.primary)} disabled={!valid || busy} onClick={() => void save()} data-testid="activity-save">
            {t('form.save')}
          </button>
        </>
      }
    >
      {f.stale ? (
        <div className={as.error} data-testid="activity-stale">
          {t('stale')}
        </div>
      ) : null}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-opp-title">
          {t('form.title')}
        </label>
        <input id="act-opp-title" className={styles.input} maxLength={200} value={d.title} onChange={(e) => f.set({ title: e.target.value })} data-testid="opp-title" autoFocus />
      </div>
      <div className={as.row}>
        <div className={cx(styles.field, as.grow)}>
          <label className={styles.label} htmlFor="act-opp-amount">
            {t('form.amount')}
          </label>
          <input
            id="act-opp-amount"
            className={styles.input}
            inputMode="numeric"
            value={hidden ? '' : d.amount}
            placeholder={hidden ? t('amountHidden') : canMoney ? '' : t('form.amountNoPerm')}
            disabled={!canMoney || hidden}
            onChange={(e) => f.set({ amount: e.target.value.replace(/\D/g, '') })}
            data-testid="opp-amount-input"
          />
        </div>
        <div className={cx(styles.field, as.grow)}>
          <label className={styles.label} htmlFor="act-opp-prob">
            {t('form.probability')}
          </label>
          <input id="act-opp-prob" className={styles.input} inputMode="decimal" value={d.probability} onChange={(e) => f.set({ probability: e.target.value })} data-testid="opp-prob" />
        </div>
      </div>
      {!amountOk || !probOk ? <div className={as.error}>{t(amountOk ? 'form.probInvalid' : 'form.amountInvalid')}</div> : null}
      <div className={as.row}>
        <div className={cx(styles.field, as.grow)}>
          <label className={styles.label} htmlFor="act-opp-stage">
            {t('dealStage')}
          </label>
          <select id="act-opp-stage" className={styles.input} value={d.stage} onChange={(e) => f.set({ stage: e.target.value as Draft['stage'] })} data-testid="opp-stage">
            {stages.map((s) => (
              <option key={s} value={s}>
                {t(`stage.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={cx(styles.field, as.grow)}>
          <label className={styles.label} htmlFor="act-opp-close">
            {t('dealClose')}
          </label>
          <input id="act-opp-close" type="date" className={styles.input} value={d.close} onChange={(e) => f.set({ close: e.target.value })} />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="act-opp-need">
          {t('need')}
        </label>
        <textarea id="act-opp-need" className={cx(styles.input, styles.body)} maxLength={5000} value={d.need} onChange={(e) => f.set({ need: e.target.value })} />
      </div>
      <div className={styles.label}>{t('form.oppHint')}</div>
    </ModalShell>
  );
}
