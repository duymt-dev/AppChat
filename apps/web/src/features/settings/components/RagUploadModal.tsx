// Hộp "Tải tài liệu lên" — prototype L7485–7502 (460px): vùng kéo thả / chọn tệp (lấy tên tệp), Tên tài liệu *, Thư mục chứa, Thẻ (dấu phẩy),
// "Cho AI học tài liệu này" (embedding). Lưu → kb.add_source (learn). Tệp thật đi qua storage port ở backend; FE mock chỉ ghi metadata.
'use client';
import { useRef, useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useRagModalStyles } from '../styles/rag-modal.styles';
import { useSettingsUi } from '../settings-store';
import { FormModal } from './FormModal';
import { Switch } from './Switch';

const NONE = '';
const COMMA = ',';
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.mp4,image/*';

export function RagUploadModal({ folders, folderId }: { folders: { id: string; name: string }[]; folderId: string | null }) {
  const t = useTranslations('settings.rag.modal');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles } = useRagModalStyles();
  const set = useSettingsUi((u) => u.set);
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState(folderId ?? NONE);
  const [tags, setTags] = useState('');
  const [learn, setLearn] = useState(true);
  const add = useAction('kb.add_source');
  const close = () => set({ kbUpload: false });
  const save = async () => {
    if (!name.trim()) return void message.error(t('errName'));
    const list = tags.split(COMMA).map((x) => x.trim()).filter(Boolean);
    const r = await add.run({ name: name.trim(), ...(folder ? { folder_id: folder } : {}), ...(list.length ? { tags: list } : {}), learn });
    if (r) close();
  };
  return (
    <FormModal
      open
      title={t('title')}
      onClose={close}
      onSave={() => void save()}
      saveLabel={t('save')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={add.isPending}
      testId="st-rag-modal"
    >
      <button type="button" className={styles.drop} onClick={() => file.current?.click()}>
        <span className={styles.dropIc}>
          <Icon name="ic-dl" size={20} color={color.brand} strokeWidth={1.7} />
        </span>
        <span className={styles.dropT}>{t.rich('drop', { b: (c) => <b>{c}</b> })}</span>
        <span className={styles.dropS}>{t('dropS')}</span>
      </button>
      <input
        ref={file}
        type="file"
        hidden
        accept={ACCEPT}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && !name) setName(f.name);
        }}
        data-testid="st-rag-file"
      />
      <div>
        <div className={s.label}>{t('name')}</div>
        <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePh')} data-testid="st-rag-name" />
      </div>
      <div>
        <div className={s.label}>{t('folder')}</div>
        <select className={s.select} value={folder} onChange={(e) => setFolder(e.target.value)} data-testid="st-rag-folder-select">
          <option value={NONE}>{t('noFolder')}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className={s.label}>{t('tags')}</div>
        <input className={s.input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('tagsPh')} />
      </div>
      <div className={styles.learnRow}>
        <div className={s.grow}>
          <div className={styles.learnT}>{t('learn')}</div>
          <div className={s.muted}>{t('learnD')}</div>
        </div>
        <Switch on={learn} onChange={setLearn} label={t('learn')} testId="st-rag-learn" />
      </div>
    </FormModal>
  );
}
