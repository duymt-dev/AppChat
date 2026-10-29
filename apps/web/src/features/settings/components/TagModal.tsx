// Hộp Tạo / Sửa thẻ — prototype L7523–7550 (420px): xem trước chip, biểu tượng cảm xúc (lưới 20), Tên (bắt buộc — viền đỏ + "Trường này
// là bắt buộc"), bảng 10 màu (vòng chọn), mô tả. Tạo → tag.create; sửa → tag.update. Trùng tên → lỗi 409 hiện ở ô tên.
'use client';
import { useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useTagModalStyles } from '../styles/tag-modal.styles';
import { useSettingsUi } from '../settings-store';
import type { Tag } from '../types';
import { FormModal } from './FormModal';

const EMOJIS = ['🙂', '😀', '😍', '🔥', '⭐', '💎', '🎁', '🛒', '💰', '📌', '🏷️', '✅', '⚠️', '❤️', '👑', '🚀', '📞', '💬', '🧊', '🌱'];
const CHECK = '✓';
const INFO = 'i';
const RING = '--ring';

export function TagModal({ id, tags, palette }: { id?: string; tags: Tag[]; palette: string[] }) {
  const t = useTranslations('settings.tags.modal');
  const s = useSectionStyles().styles;
  const { styles, cx } = useTagModalStyles();
  const set = useSettingsUi((u) => u.set);
  const cur = tags.find((x) => x.id === id);
  const [name, setName] = useState(cur?.name ?? '');
  const [tone, setTone] = useState(cur?.color ?? palette[0] ?? '');
  const [emoji, setEmoji] = useState(cur?.emoji || EMOJIS[0]!);
  const [desc, setDesc] = useState(cur?.description ?? '');
  const [pick, setPick] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const create = useAction('tag.create');
  const update = useAction('tag.update');
  const close = () => set({ tagModal: null });
  const save = async () => {
    if (!name.trim()) return setErr(t('required'));
    const body = { name: name.trim(), color: tone, emoji, ...(desc.trim() ? { description: desc.trim() } : {}) };
    const r = cur ? await update.run({ tag_id: cur.id, ...body }, { silent: true }) : await create.run(body, { silent: true });
    if (r) close();
    else setErr(t('dup'));
  };
  return (
    <FormModal
      open
      title={cur ? t('editTitle') : t('title')}
      onClose={close}
      onSave={() => void save()}
      saveLabel={cur ? t('save') : t('create')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={create.isPending || update.isPending}
      testId="st-tag-modal"
    >
      <span className={styles.preview} style={{ color: tone }}>
        {name.trim() || t('namePh')}
      </span>
      <div className={styles.top}>
        <div>
          <div className={s.label}>{t('emoji')}</div>
          <button type="button" className={styles.emoji} onClick={() => setPick(!pick)} aria-label={t('emoji')} aria-expanded={pick}>
            {emoji}
          </button>
          {pick ? (
            <div className={styles.emojis}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={styles.e}
                  onClick={() => {
                    setEmoji(e);
                    setPick(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={s.grow}>
          <div className={s.label}>{t('name')}</div>
          <input
            className={cx(styles.name, !!err && styles.bad)}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr(null);
            }}
            placeholder={t('namePh')}
            data-testid="st-tag-name"
          />
          {err ? (
            <div className={styles.err} role="alert">
              {err}
            </div>
          ) : null}
        </div>
      </div>
      <div>
        <div className={s.label}>{t('color')}</div>
        <div className={styles.colors} role="radiogroup" aria-label={t('color')}>
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === tone}
              aria-label={c}
              className={cx(styles.dot, c === tone && styles.dotOn)}
              style={{ background: c, [RING]: c } as CSSProperties}
              onClick={() => setTone(c)}
            >
              {c === tone ? CHECK : null}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className={cx(s.label, styles.descL)}>
          {t('desc')}
          <span className={styles.info}>{INFO}</span>
        </div>
        <textarea className={styles.desc} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('descPh')} />
      </div>
    </FormModal>
  );
}
