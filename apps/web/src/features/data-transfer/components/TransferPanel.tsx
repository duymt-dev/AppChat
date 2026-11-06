// TransferPanel (TIP-038b P4, DC-374) — đường nhập thủ công dùng chung backend với Trợ lý: chọn thực thể → tải CSV / XLSX → server lập
// kế hoạch (ánh xạ đoán + kiểm từng dòng) → sửa ánh xạ / chọn "chỉ nhập dòng hợp lệ" → Nhập (xác nhận có số dòng) → kết quả + tệp lỗi.
// Mở từ Trợ lý (thẻ plan / commit → `open:transfer_plan`) thì hiện đúng kế hoạch đó. Prototype không có màn này (PD-023).
'use client';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { TRANSFER_ENTITIES } from '@appchat/shared';
import { allInvalidRows, transferCapsQuery } from '../api';
import { errorCsv, saveText } from '../error-file';
import { useTransfer } from '../hooks/useTransfer';
import { useTransferStyles } from '../styles/transfer.styles';
import { MappingEditor } from './MappingEditor';
import { PreviewTable } from './PreviewTable';
import { TransferResult } from './TransferResult';

const ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const STATS = ['total', 'valid', 'invalid', 'duplicates'] as const;

export function TransferPanel() {
  const t = useTranslations('data-transfer');
  const { styles: s, cx } = useTransferStyles();
  const x = useTransfer();
  const caps = useQuery({ ...transferCapsQuery(), enabled: x.ui.open });
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const p = x.plan;
  const draft = p?.status === 'draft';
  const canImport = (e: string) => caps.data?.find((c) => c.entity === e)?.import.supported ?? false;
  const blocked = !p || !p.counts.valid || (p.row_policy === 'all_valid' && p.counts.invalid > 0);

  const downloadErrors = async () => {
    if (!p) return;
    setSaving(true);
    try {
      const rows = await allInvalidRows(p.id);
      const head = [t('errorFile.row'), t('errorFile.column'), t('errorFile.code'), t('errorFile.message'), t('errorFile.value')];
      const label = (c: string) => (t.has(`error.${c}` as never) ? t(`error.${c}` as never) : c);
      saveText(errorCsv(p, rows, head, label), `${p.file_name.replace(/\.[^.]+$/, '')}-loi.csv`);
    } finally {
      setSaving(false);
    }
  };

  const footer = !p ? (
    <button type="button" className={s.btn} onClick={() => x.ui.close()}>
      {t('close')}
    </button>
  ) : draft ? (
    <>
      <button type="button" className={s.btn} disabled={x.busy} onClick={() => void x.abort()} data-testid="dt-cancel">
        {t('cancel')}
      </button>
      <button type="button" className={cx(s.btn, s.primary)} disabled={blocked || x.busy} onClick={() => void x.submit()} data-testid="dt-commit">
        {t('commit', { n: p.counts.valid })}
      </button>
    </>
  ) : p.status === 'committing' ? (
    <button type="button" className={s.btn} disabled={x.busy} onClick={() => void x.abort()} data-testid="dt-cancel">
      {t('stop')}
    </button>
  ) : (
    <button type="button" className={cx(s.btn, s.primary)} onClick={() => x.ui.close()} data-testid="dt-done">
      {t('done')}
    </button>
  );

  return (
    <ModalShell open onClose={() => x.ui.close()} width={760} title={t('title')} icon="ic-download" iconColor={color.brandDeep} iconBg={color.brandBg} closeLabel={t('close')} testId="dt-panel" footer={footer}>
      {!p ? (
        <>
          {x.missing ? <div className={s.err}>{t('planMissing')}</div> : null}
          <div className={s.sectionTitle}>{t('entityTitle')}</div>
          <div className={s.entity} role="radiogroup" aria-label={t('entityTitle')}>
            {TRANSFER_ENTITIES.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={x.ui.entity === e} disabled={!canImport(e)} className={cx(s.pill, x.ui.entity === e && s.pillOn)} onClick={() => x.ui.show({ entity: e })} data-entity={e}>
                {t(`entity.${e}`)}
              </button>
            ))}
          </div>
          <div className={s.drop}>
            <Icon name="ic-download" size={22} color={color.text3} />
            {t('hint')}
            <button type="button" className={cx(s.btn, s.touch)} disabled={x.busy || !canImport(x.ui.entity)} onClick={() => input.current?.click()} data-testid="dt-pick">
              {x.busy ? t('reading') : t('pick')}
            </button>
            <input ref={input} type="file" hidden accept={ACCEPT} onChange={(e) => void x.pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} data-testid="dt-file" />
          </div>
          {x.uploadErr ? <div className={s.err}>{t('uploadFailed')}</div> : null}
          <div className={s.note}>{t('limits')}</div>
        </>
      ) : (
        <>
          <div className={s.file}>
            <Icon name="ic-doc" size={16} />
            <span data-testid="dt-file-name">{p.file_name}</span>
            <span className={s.muted}>· {t(`entity.${p.entity}`)}</span>
          </div>
          {draft ? (
            <>
              <div className={s.stats}>
                {STATS.map((k) => (
                  <div key={k} className={cx(s.stat, k === 'invalid' && p.counts.invalid > 0 && s.statBad)} data-stat={k}>
                    <b>{p.counts[k]}</b>
                    {t(`count.${k}`)}
                  </div>
                ))}
              </div>
              <div className={s.sectionTitle}>{t('mapTitle')}</div>
              <MappingEditor plan={p} disabled={x.busy} onChange={x.setField} />
              <div className={s.sectionTitle}>{t('preview')}</div>
              <PreviewTable plan={p} />
              {p.counts.invalid > 0 ? (
                <div className={s.policy}>
                  <label className={s.policy}>
                    <input type="checkbox" checked={p.row_policy === 'only_valid'} disabled={x.busy} onChange={(e) => void x.update({ row_policy: e.target.checked ? 'only_valid' : 'all_valid' })} data-testid="dt-only-valid" />
                    {t('onlyValid', { n: p.counts.invalid })}
                  </label>
                  <button type="button" className={cx(s.btn, s.touch)} disabled={saving} onClick={() => void downloadErrors()} data-testid="dt-errors">
                    {t('downloadErrors')}
                  </button>
                </div>
              ) : null}
              {p.counts.duplicates > 0 ? <div className={s.note}>{t('duplicatesNote', { n: p.counts.duplicates })}</div> : null}
            </>
          ) : (
            <TransferResult plan={p} />
          )}
        </>
      )}
    </ModalShell>
  );
}
