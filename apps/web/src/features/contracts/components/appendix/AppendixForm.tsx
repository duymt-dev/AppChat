// Form tạo / sửa phụ lục (TIP-030b F3 spec 12–13): tiêu đề + nội dung điều chỉnh (chữ thuần) + giá trị điều chỉnh (VND có dấu, chỉ là thoả
// thuận — không đổi đơn / hoá đơn). Sửa chỉ ở nháp, gửi kèm version (người khác vừa sửa → 409, giữ nguyên chữ đã nhập).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAppendixStyles } from '../../styles/appendix.styles';
import type { AppendixActions } from '../../hooks/useAppendices';
import type { Appendix } from '../../types';

const MONEY = /^-?\d+$/;

export function AppendixForm({ contractId, edit, x, onClose }: { contractId: string; edit: Appendix | null; x: AppendixActions; onClose: () => void }) {
  const t = useTranslations('contracts.appendix');
  const { styles, cx } = useAppendixStyles();
  const [title, setTitle] = useState(edit?.title ?? '');
  const [content, setContent] = useState(edit?.content ?? '');
  const [delta, setDelta] = useState(edit?.value_delta ?? '');
  const [key] = useState(() => crypto.randomUUID());
  const okDelta = !delta || MONEY.test(delta);
  const valid = !!title.trim() && !!content.trim() && okDelta;
  const busy = x.create.isPending || x.update.isPending;
  const save = async () => {
    if (!valid) return;
    const r = edit
      ? await x.update.run({ appendix_id: edit.id, if_version: edit.version, patch: { title: title.trim(), content: content.trim(), value_delta: delta || null } })
      : await x.create.run({ contract_id: contractId, title: title.trim(), content: content.trim(), ...(delta ? { value_delta: delta } : {}), request_key: key });
    if (r) onClose();
  };
  return (
    <ModalShell
      open
      stacked
      onClose={onClose}
      width={520}
      title={t(edit ? 'editTitle' : 'newTitle')}
      icon="ic-doc"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('cancel')}
      testId="ct-apx-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary)} disabled={!valid || busy} onClick={() => void save()} data-testid="ct-apx-save">
            {t('save')}
          </button>
        </>
      }
    >
      <div className={styles.meta}>{t('hint')}</div>
      <label className={styles.field}>
        {t('fTitle')}
        <input className={styles.input} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} data-testid="ct-apx-title" />
      </label>
      <label className={styles.field}>
        {t('fContent')}
        <textarea className={cx(styles.input, styles.area)} value={content} maxLength={20000} onChange={(e) => setContent(e.target.value)} data-testid="ct-apx-content" />
      </label>
      <label className={styles.field}>
        {t('fDelta')}
        <input className={styles.input} inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))} data-testid="ct-apx-delta" />
      </label>
      {okDelta ? <div className={styles.meta}>{t('deltaHint')}</div> : <div className={styles.meta}>{t('deltaBad')}</div>}
    </ModalShell>
  );
}
