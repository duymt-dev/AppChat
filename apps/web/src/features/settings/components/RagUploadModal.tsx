// Hộp "Tải tài liệu lên" — prototype L7485–7502 (460px): vùng kéo thả / chọn tệp (lấy tên tệp), Tên tài liệu *, Thư mục chứa, Thẻ (dấu phẩy),
// "Cho AI học tài liệu này" (embedding), Ai được dùng (public / internal — D54). Lưu → tải tệp (`transport.upload`, purpose kb) rồi
// kb.add_source { file_id, learn, visibility? } (TIP-020). TIP-020b: chưa chọn "Ai được dùng" → KHÔNG gửi visibility — server kế thừa
// mặc định của thư mục (không thư mục → public); gợi ý hiện mặc định đang áp. Mock: upload trả id giả, chỉ ghi metadata.
'use client';
import { useRef, useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { transport } from '@/shared/api/client';
import { useSectionStyles } from '../styles/section.styles';
import { useRagModalStyles } from '../styles/rag-modal.styles';
import { useSettingsUi } from '../settings-store';
import { FormModal } from './FormModal';
import { Switch } from './Switch';
import type { KbFolder } from '../types';

const NONE = '';
const COMMA = ',';
const VIS = ['public', 'internal'] as const;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.txt,.mp4,image/*';

export function RagUploadModal({ folders, folderId }: { folders: KbFolder[]; folderId: string | null }) {
  const t = useTranslations('settings.rag.modal');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles, cx } = useRagModalStyles();
  const set = useSettingsUi((u) => u.set);
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState(folderId ?? NONE);
  const [tags, setTags] = useState('');
  const [learn, setLearn] = useState(true);
  /** null = chưa chọn → kế thừa thư mục. */
  const [vis, setVis] = useState<(typeof VIS)[number] | null>(null);
  const inherited = folders.find((f) => f.id === folder)?.visibility ?? 'public';
  const shown = vis ?? inherited;
  const add = useAction('kb.add_source');
  const close = () => set({ kbUpload: false });
  const save = async () => {
    if (!name.trim()) return void message.error(t('errName'));
    const list = tags.split(COMMA).map((x) => x.trim()).filter(Boolean);
    let fileId: string | undefined;
    if (picked) {
      setUploading(true);
      try {
        fileId = (await transport.upload(picked, 'kb')).file_id;
      } catch {
        return void message.error(t('errUpload'));
      } finally {
        setUploading(false);
      }
    }
    const r = await add.run({ name: name.trim(), ...(fileId ? { file_id: fileId } : {}), ...(folder ? { folder_id: folder } : {}), ...(list.length ? { tags: list } : {}), learn, ...(vis ? { visibility: vis } : {}) });
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
      pending={add.isPending || uploading}
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
          const f = e.target.files?.[0] ?? null;
          setPicked(f);
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
      <div>
        <div className={s.label}>{t('visibility')}</div>
        <div className={styles.seg} role="radiogroup" aria-label={t('visibility')} data-testid="st-rag-vis">
          {VIS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={shown === v}
              className={cx(styles.segBtn, shown === v && styles.segOn)}
              onClick={() => setVis(v)}
              data-testid={`st-rag-vis-${v}`}
            >
              {t(v === 'public' ? 'visPublic' : 'visInternal')}
            </button>
          ))}
        </div>
        <div className={cx(s.muted, styles.visHint)} data-testid="st-rag-vis-hint">
          {t(shown === 'public' ? 'visPublicD' : 'visInternalD')}
          {vis ? null : ` ${t('visInherited')}`}
        </div>
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
