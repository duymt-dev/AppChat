// "AI soạn báo giá từ nội dung" (D30, COMMERCE §12) — màn mới không có trong prototype: dùng ModalShell + token sẵn có.
// Số liệu luôn lấy từ catalog; dòng ngoài danh mục / giảm > 5% buộc duyệt; AI chỉ tạo nháp → mở drawer bản nháp.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { contactsQuery } from '@/features/customers/api';
import { useQuoteFormStyles } from '../styles/form.styles';
import { useQuotesUi } from '../quotes-store';

const ALL_CONTACTS = {
  stage: 'all',
  q: '',
  mine: false,
  status: '',
  owner_id: '',
  group: '',
  source: '',
  tag_id: '',
  sort: 'recent',
} as const;

export function DraftFromContentModal() {
  const ui = useQuotesUi();
  return ui.draftOpen ? <DraftForm /> : null;
}

function DraftForm() {
  const t = useTranslations('quotes.draft');
  const { message } = App.useApp();
  const { styles, cx } = useQuoteFormStyles();
  const ui = useQuotesUi();
  const contacts = useQuery(contactsQuery(ALL_CONTACTS)).data?.data ?? [];
  const draft = useAction<{ quote_id: string; code: string; off_catalog: number }>(
    'quote.draft_from_content',
  );
  const [contact, setContact] = useState('');
  const [content, setContent] = useState('');
  const [err, setErr] = useState('');
  const close = () => ui.set({ draftOpen: false });
  const run = async () => {
    if (!contact || !content.trim()) return setErr(t('required'));
    const res = await draft.run({ contact_id: contact, content }, { silent: true });
    if (!res) return;
    void message.success(t('done', { code: res.result.code, n: res.result.off_catalog }));
    ui.set({ draftOpen: false, detail: res.result.quote_id, tab: 'overview' });
  };
  return (
    <ModalShell
      open
      onClose={close}
      width={560}
      title={t('title')}
      icon="ic-spark"
      iconColor={color.violet}
      iconBg={color.violetBg}
      closeLabel={t('cancel')}
      testId="q-draft"
      roomy
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void run()}
            disabled={draft.isPending}
            data-testid="q-draft-run"
          >
            {t('run')}
          </button>
        </>
      }
    >
      <div className={styles.hint}>{t('sub')}</div>
      {err ? <div className={styles.err}>{err}</div> : null}
      <div className={styles.grid}>
        <div className={cx(styles.field, styles.wide)}>
          <label className={styles.label}>{t('contact')}</label>
          <select
            className={styles.input}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            data-testid="q-draft-contact"
          >
            <option value="">{t('contact')}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className={cx(styles.field, styles.wide)}>
          <label className={styles.label}>{t('content')}</label>
          <textarea
            className={cx(styles.input, styles.area)}
            rows={4}
            value={content}
            placeholder={t('contentPh')}
            onChange={(e) => setContent(e.target.value)}
            data-testid="q-draft-content"
          />
        </div>
      </div>
    </ModalShell>
  );
}
