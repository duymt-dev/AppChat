// Hộp Sửa thẻ xem trước (REQ-E03b): form theo khuôn input của action — object → nhóm ô, array → danh sách (thêm / bớt dòng), enum → chọn,
// số / bật-tắt / chữ; lỗi 422 hiện dưới từng ô. "Xem trước lại" chỉ gửi preview mới (không thực thi) — thẻ được thay bằng thẻ mới.
'use client';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { fieldOf, emptyOf, leafKind, useEditActionPreview, type Brief } from '../hooks/useEditActionPreview';
import { useApprovalStyles } from '../styles/approval.styles';
import type { ChatMessage } from '../types';

type Path = (string | number)[];
type Ctx = { set: (p: Path, v: unknown) => void; errors: Record<string, string> };

function Leaf({ brief, value, path, label, c }: { brief: string; value: unknown; path: Path; label: string; c: Ctx }) {
  const t = useTranslations('assistant.preview');
  const { styles } = useApprovalStyles();
  const k = leafKind(brief);
  const id = path.join('.');
  const err = c.errors[id];
  return (
    <label>
      <div className={styles.label}>{label}</div>
      {k.kind === 'enum' ? (
        <select className={styles.input} value={String(value ?? '')} onChange={(e) => c.set(path, e.target.value)} data-field={id}>
          <option value="">{t('unset')}</option>
          {k.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : k.kind === 'boolean' ? (
        <select className={styles.input} value={String(value ?? '')} onChange={(e) => c.set(path, e.target.value === '' ? null : e.target.value === 'true')} data-field={id}>
          <option value="">{t('unset')}</option>
          <option value="true">✓</option>
          <option value="false">—</option>
        </select>
      ) : (
        <input
          className={styles.input}
          type={k.kind === 'number' ? 'number' : 'text'}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => c.set(path, k.kind === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
          data-field={id}
        />
      )}
      {err ? <div className={styles.fieldErr}>{err}</div> : null}
    </label>
  );
}

function Field({ brief, value, path, label, c }: { brief: Brief; value: unknown; path: Path; label: string; c: Ctx }) {
  const t = useTranslations('assistant.preview');
  const { styles } = useApprovalStyles();
  if (typeof brief === 'string') return <Leaf brief={brief} value={value} path={path} label={label} c={c} />;
  if (Array.isArray(brief)) {
    const list = Array.isArray(value) ? value : [];
    const item = brief[0] ?? 'string';
    return (
      <div className={styles.form}>
        <div className={styles.label}>{label}</div>
        {list.map((v, i) => (
          <div key={i}>
            <Field brief={item} value={v} path={[...path, i]} label={`${label} #${i + 1}`} c={c} />
            <button type="button" className={styles.reject} onClick={() => c.set(path, list.filter((_, j) => j !== i))}>
              {t('removeRow')}
            </button>
          </div>
        ))}
        <button type="button" className={styles.reject} onClick={() => c.set(path, [...list, emptyOf(item)])} data-testid={`add-${path.join('.')}`}>
          {t('addRow')}
        </button>
      </div>
    );
  }
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const fields = Object.keys(brief).filter((k) => k !== '…');
  const body = fields.map((k) => {
    const { name, required } = fieldOf(k);
    return <Field key={name} brief={brief[k]!} value={obj[name]} path={[...path, name]} label={required ? `${name} *` : name} c={c} />;
  });
  return path.length ? (
    <div className={styles.form}>
      <div className={styles.label}>{label}</div>
      {body}
    </div>
  ) : (
    <>{body}</>
  );
}

export function EditActionPreviewModal({ m, onClose }: { m: ChatMessage; onClose: () => void }) {
  const t = useTranslations('assistant.preview');
  const { styles } = useApprovalStyles();
  const e = useEditActionPreview(m);
  const save = async () => {
    if (await e.submit()) onClose();
  };
  return (
    <ModalShell
      open
      onClose={onClose}
      width={520}
      title={t('editTitle', { title: m.card!.title })}
      icon="ic-edit"
      iconColor={color.brand}
      iconBg={color.brandBg}
      closeLabel={t('close')}
      testId="asst-edit"
      footer={
        <>
          <button type="button" className={styles.reject} onClick={onClose}>
            {t('close')}
          </button>
          <button type="button" className={styles.approve} disabled={e.busy} onClick={() => void save()} data-testid="asst-edit-save">
            {t('repreview')}
          </button>
        </>
      }
    >
      <div className={styles.meta}>{t('editHint')}</div>
      <Field brief={e.schema} value={e.value} path={[]} label="" c={{ set: e.set, errors: e.errors }} />
      {e.failed ? (
        <div className={styles.fieldErr} data-testid="asst-edit-failed">
          {t('failed', { code: e.failed })}
        </div>
      ) : null}
    </ModalShell>
  );
}
