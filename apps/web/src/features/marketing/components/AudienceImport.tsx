// Nhập danh sách người nhận từ Excel / CSV (TIP-037): tải tệp (POST /v1/files, purpose import) → campaign.audience_import (server khớp khách
// thấy được theo SĐT / email, tạo khách mới nếu có quyền crm.import, không giành khách đã có người phụ trách, không đăng ký lại khách đã huỷ
// nhận) → lô id khách thật (`audience_batch_id`). Hiện số dòng hợp lệ / lỗi / trùng — không có số mẫu cố định.
'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { transport } from '@/shared/api/client';
import { useStepStyles } from '../styles/steps.styles';
import { useWizardStyles } from '../styles/wizard.styles';
import type { ImportBatch } from '../hooks/useWizard';

type Out = { batch_id: string | null; rows: number; valid: number; invalid: number; duplicate: number; opted_out: number; created: number; errors: { row: number; reason: string }[] };
const ACCEPT = '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function AudienceImportButton({ onDone }: { onDone: (b: ImportBatch) => void }) {
  const t = useTranslations('marketing.wiz');
  const { styles } = useStepStyles();
  const input = useRef<HTMLInputElement>(null);
  const run = useAction<Out>('campaign.audience_import');
  const [busy, setBusy] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const up = await transport.upload(f, 'import');
      const r = await run.run({ file_id: up.file_id }, { silent: true });
      if (r?.result.batch_id) onDone({ id: r.result.batch_id, name: f.name, rows: r.result.rows, valid: r.result.valid, invalid: r.result.invalid, duplicate: r.result.duplicate });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => void pick(e.target.files?.[0])} data-testid="mk-wiz-file" />
      <button type="button" className={styles.upload} disabled={busy} onClick={() => input.current?.click()} data-testid="mk-wiz-upload">
        <Icon name="ic-dl" size={14} color={color.blue} />
        {busy ? t('uploading') : t('upload')}
      </button>
    </>
  );
}

export function AudienceImportResult({ b, onRemove }: { b: ImportBatch; onRemove: () => void }) {
  const t = useTranslations('marketing.wiz');
  const w = useWizardStyles().styles;
  const { styles } = useStepStyles();
  return (
    <div className={styles.done} data-testid="mk-wiz-uploaded">
      <span className={styles.doneIc}>
        <Icon name="ic-check" size={16} color={color.white} strokeWidth={1.9} />
      </span>
      <div className={w.grow}>
        <b>{b.name}</b>
        <div className={styles.doneS}>{t('uploadSum', { rows: b.rows, valid: b.valid, invalid: b.invalid, dup: b.duplicate })}</div>
      </div>
      <button type="button" className={styles.link} onClick={onRemove}>
        {t('unload')}
      </button>
    </div>
  );
}
