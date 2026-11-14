// Hộp Tạo / Sửa câu trả lời mẫu — prototype L7505–7520 (540px): Nhóm (danh mục có sẵn + "Nhóm mới") · Shortcut (mono, tự thêm "/") ·
// Tên mẫu * · Nội dung + gợi ý biến {tên} {sản phẩm} {đơn hàng}. Tạo → canned_reply.create; sửa → canned_reply.update.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useReplyModalStyles } from '../styles/reply-modal.styles';
import { useSettingsUi } from '../settings-store';
import type { Reply } from '../types';
import { FormModal } from './FormModal';

const SLASH = '/';
const SHORTCUT = /^\/[a-z0-9_-]{1,30}$/;
const NEW = '__new__';
const VARS = ['{tên}', '{sản phẩm}', '{đơn hàng}'];

export function ReplyModal({ id, rows }: { id?: string; rows: Reply[] }) {
  const t = useTranslations('settings.replies.modal');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles } = useReplyModalStyles();
  const set = useSettingsUi((u) => u.set);
  const cats = [...new Set(rows.map((r) => r.category))];
  const cur = rows.find((r) => r.id === id);
  const [cat, setCat] = useState(cur?.category ?? cats[0] ?? NEW);
  const [newCat, setNewCat] = useState('');
  const [sc, setSc] = useState(cur?.shortcut ?? SLASH);
  const [title, setTitle] = useState(cur?.title ?? '');
  const [body, setBody] = useState(cur?.body ?? '');
  const create = useAction('canned_reply.create');
  const update = useAction('canned_reply.update');
  const close = () => set({ replyModal: null });
  const save = async () => {
    const shortcut = (sc.trim().startsWith(SLASH) ? sc.trim() : SLASH + sc.trim()).toLowerCase();
    const category = cat === NEW ? newCat.trim() : cat;
    if (!title.trim()) return void message.error(t('errTitle'));
    if (!SHORTCUT.test(shortcut)) return void message.error(t('errShortcut'));
    if (!category || !body.trim()) return void message.error(t('errBody'));
    const input = { shortcut, title: title.trim(), body: body.trim(), category };
    const r = cur ? await update.run({ reply_id: cur.id, ...input }) : await create.run(input);
    if (r) close();
  };
  return (
    <FormModal
      open
      wide
      title={cur ? t('editTitle') : t('title')}
      onClose={close}
      onSave={() => void save()}
      saveLabel={t('save')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={create.isPending || update.isPending}
      testId="st-reply-modal"
    >
      <div className={styles.two}>
        <div className={styles.cat}>
          <div className={s.label}>{t('cat')}</div>
          <select className={s.select} value={cat} onChange={(e) => setCat(e.target.value)} data-testid="st-reply-cat">
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NEW}>{t('newCat')}</option>
          </select>
        </div>
        <div className={s.grow}>
          <div className={s.label}>{t('shortcut')}</div>
          <input className={styles.mono} value={sc} onChange={(e) => setSc(e.target.value)} placeholder={t('shortcutPh')} data-testid="st-reply-sc" />
        </div>
      </div>
      {cat === NEW ? (
        <input className={s.input} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t('newCatPh')} aria-label={t('newCat')} data-testid="st-reply-newcat" />
      ) : null}
      <div>
        <div className={s.label}>{t('name')}</div>
        <input className={s.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('namePh')} data-testid="st-reply-title" />
      </div>
      <div>
        <div className={s.label}>{t('body')}</div>
        <textarea className={styles.body} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('bodyPh')} data-testid="st-reply-body" />
        <div className={styles.vars}>
          {t('vars')}
          {VARS.map((v) => (
            <button key={v} type="button" className={styles.v} onClick={() => setBody(`${body}${body && !body.endsWith(' ') ? ' ' : ''}${v}`)}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </FormModal>
  );
}
