// RichTemplateEditor (Blueprint §7.3, templates.md §2 `rich`): tên, loại, thân mẫu (HTML + biến {{…}}), chip chèn biến theo loại (registry
// @appchat/shared), bảng kiểm. Đề nghị thanh toán / phiếu thu: dòng "không thay thế hoá đơn GTGT" khoá, render tự chèn nếu thiếu (§6).
// Biến lạ / vòng items sai → báo lỗi khi lưu (§3, `templateVars` dùng chung với server). Lưu → doc_template.create / update.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DOC_KINDS, NOT_VAT_KINDS, htmlText, legalChecklist, templateVars, varsForKind } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useDocModalStyles } from '../styles/doc-modal.styles';
import type { DocKindKey, DocTemplate } from '../types';
import { FormModal } from './FormModal';
import { LegalChecklist } from './LegalChecklist';

const OPEN = '{{';
const CLOSE = '}}';

/** Mục bảng kiểm còn thiếu theo biến + nội dung (cùng luật với server — `legalChecklist` dùng chung). */
export const missingChecks = (kind: DocKindKey, body: string) =>
  legalChecklist(kind, htmlText(body), templateVars(kind, body).vars)
    .filter((c) => !c.ok)
    .map((c) => c.key);

export function RichTemplateModal({ tpl, onClose }: { tpl?: DocTemplate; onClose: () => void }) {
  const t = useTranslations('settings.doctpl');
  const tm = useTranslations('settings.doctpl.modal');
  const s = useSectionStyles().styles;
  const { styles } = useDocModalStyles();
  const [kind, setKind] = useState<DocKindKey>(tpl?.kind ?? 'quote');
  const [name, setName] = useState(tpl?.name ?? '');
  const [body, setBody] = useState(tpl?.body ?? '');
  const [def, setDef] = useState(false);
  const [err, setErr] = useState('');
  const create = useAction('doc_template.create');
  const update = useAction('doc_template.update');
  const save = async () => {
    if (!name.trim()) return setErr(tm('errName'));
    const bad = templateVars(kind, body).unknown;
    if (bad.length) return setErr(tm('errVars', { v: bad.join(', ') }));
    setErr('');
    const r = tpl
      ? await update.run({ template_id: tpl.id, name: name.trim(), body, if_version: tpl.version, ...(def ? { is_default: true } : {}) })
      : await create.run({ kind, name: name.trim(), source: 'rich', body, is_default: def });
    if (r) onClose();
  };
  return (
    <FormModal
      open
      wide
      title={tpl ? tm('editT') : tm('newT')}
      onClose={onClose}
      onSave={() => void save()}
      saveLabel={tm('save')}
      cancelLabel={tm('cancel')}
      closeLabel={tm('close')}
      pending={create.isPending || update.isPending}
      testId="doc-rich-modal"
    >
      <div className={styles.row2}>
        <div>
          <div className={s.label}>{tm('name')}</div>
          <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} data-testid="doc-name" />
        </div>
        <div>
          <div className={s.label}>{tm('kind')}</div>
          <select className={s.select} value={kind} disabled={!!tpl} onChange={(e) => setKind(e.target.value as DocKindKey)} data-testid="doc-kind-select">
            {DOC_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kind.${k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <div className={s.label}>{tm('vars')}</div>
        <div className={styles.vars}>
          {varsForKind(kind).map((v) => (
            <button key={v.key} type="button" onClick={() => setBody(body + OPEN + v.key + CLOSE)} title={t(`var.${v.key.replace('.', '_')}`)}>
              {v.key}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className={s.label}>{tm('body')}</div>
        <textarea className={styles.body} value={body} onChange={(e) => setBody(e.target.value)} placeholder={tm('bodyPh')} data-testid="doc-body" />
      </div>
      {NOT_VAT_KINDS.includes(kind) ? (
        <div className={styles.lock} data-testid="doc-not-vat">
          <Icon name="ic-shield" size={13} color={color.text3} />
          {tm('notVat')}
        </div>
      ) : null}
      <label className={styles.check1}>
        <input type="checkbox" checked={def || !!tpl?.is_default} disabled={!!tpl?.is_default} onChange={(e) => setDef(e.target.checked)} />
        {tm('asDefault')}
      </label>
      <LegalChecklist kind={kind} missing={missingChecks(kind, body)} />
      {err ? (
        <div className={styles.err} data-testid="doc-err">
          {err}
        </div>
      ) : null}
    </FormModal>
  );
}
