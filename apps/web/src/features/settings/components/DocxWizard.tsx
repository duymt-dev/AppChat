// DocxUploadWizard (Blueprint §7.3; templates.md §2 `docx`, §4, §8): 1) tải file Word của DN (.docx ≤ 10MB, từ chối .docm / macro;
// `POST /v1/files` purpose document → file_id — server kiểm macro) → 2) AI nhận diện biến (doc_template.detect_fields) → FieldMapper: người dùng xem từng vị trí, đổi / bỏ biến, thêm dòng; mức tin cậy thấp
// tô vàng → 3) bảng kiểm pháp lý (cảnh báo, không chặn) → lưu. **Không lưu khi chưa qua bước người xác nhận** (nút Lưu chỉ ở bước 3).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DOC_KINDS, varsForKind } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { transport } from '@/shared/api/client';
import { useSectionStyles } from '../styles/section.styles';
import { useDocModalStyles } from '../styles/doc-modal.styles';
import type { DetectedField, DocKindKey, DocTemplate } from '../types';
import { FormModal } from './FormModal';
import { LegalChecklist } from './LegalChecklist';

const MAX = 10 * 1024 * 1024;
const LOW = 0.7;
const PCT = 100;
const STEPS = [1, 2, 3] as const;
const FILE_ERRS = ['not_docx', 'macro', 'too_large', 'empty'];

export function DocxWizard({ tpl, onClose }: { tpl?: DocTemplate; onClose: () => void }) {
  const t = useTranslations('settings.doctpl');
  const tw = useTranslations('settings.doctpl.wizard');
  const s = useSectionStyles().styles;
  const { styles, cx } = useDocModalStyles();
  const [step, setStep] = useState<1 | 2 | 3>(tpl ? 2 : 1);
  const [kind, setKind] = useState<DocKindKey>(tpl?.kind ?? 'contract');
  const [name, setName] = useState(tpl?.name ?? '');
  const [file, setFile] = useState(tpl?.file_name ?? '');
  const [fileId, setFileId] = useState(tpl?.file_id ?? '');
  const [uploading, setUploading] = useState(false);
  const [fields, setFields] = useState<DetectedField[]>(tpl?.fields.map((f) => ({ ...f, confidence: 1 })) ?? []);
  const [missing, setMissing] = useState<string[]>(tpl?.checklist_missing ?? []);
  const [err, setErr] = useState('');
  const detect = useAction<{ fields: DetectedField[]; checklist: { key: string; ok: boolean }[] }>('doc_template.detect_fields');
  const create = useAction('doc_template.create');
  const update = useAction('doc_template.update');
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) return setErr(tw('errType'));
    if (f.size > MAX) return setErr(tw('errSize'));
    setErr('');
    setFile(f.name);
    if (!name) setName(f.name.replace(/\.docx$/i, ''));
    setUploading(true);
    const id = await transport
      .upload(f, 'document')
      .then((u) => u.file_id)
      .catch(() => null)
      .finally(() => setUploading(false));
    if (!id) return setErr(tw('errUpload'));
    setFileId(id);
    const onError = (e: { error: { fields?: Record<string, string> } }) => {
      const code = e.error.fields?.file_id ?? '';
      setErr(tw(`errFile.${FILE_ERRS.includes(code) ? code : 'other'}`));
      return true;
    };
    const r = await detect.run({ kind, file_id: id, file_name: f.name }, { silent: true, onError });
    if (!r) return;
    setFields(r.result.fields);
    setMissing(r.result.checklist.filter((c) => !c.ok).map((c) => c.key));
    setStep(2);
  };
  const save = async () => {
    if (!name.trim()) return setErr(tw('errName'));
    const payload = fields.map(({ placeholder, variable }) => ({ placeholder, variable }));
    const r = tpl
      ? await update.run({ template_id: tpl.id, name: name.trim(), fields: payload, if_version: tpl.version })
      : await create.run({ kind, name: name.trim(), source: 'docx', file_name: file, file_id: fileId, fields: payload });
    if (r) onClose();
  };
  const next = () => (step === 2 ? (fields.length ? setStep(3) : setErr(tw('errFields'))) : void save());
  return (
    <FormModal
      open
      wide
      title={tpl ? tw('editT') : tw('title')}
      onClose={onClose}
      onSave={next}
      saveLabel={step === 3 ? tw('save') : tw('next')}
      cancelLabel={tw('cancel')}
      closeLabel={tw('close')}
      pending={uploading || detect.isPending || create.isPending || update.isPending}
      testId="doc-docx-modal"
    >
      <div className={styles.steps}>
        {STEPS.map((n) => (
          <span key={n} className={cx(styles.step, step >= n && styles.stepOn)} data-step={n}>
            <span>{n}</span>
            {tw(`step.${n}`)}
          </span>
        ))}
      </div>
      {step === 1 ? (
        <>
          <div>
            <div className={s.label}>{tw('kind')}</div>
            <select className={s.select} value={kind} onChange={(e) => setKind(e.target.value as DocKindKey)} data-testid="docx-kind">
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kind.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.drop}>
            <Icon name="ic-doc" size={28} color={color.brandInk} />
            <div className={styles.dropT}>{uploading || detect.isPending ? tw('detecting') : tw('dropT')}</div>
            {tw('dropS')}
            <div>
              <label className={styles.pick}>
                {tw('pick')}
                <input type="file" accept=".docx,.docm" onChange={(e) => void onFile(e.target.files?.[0])} data-testid="docx-file" />
              </label>
            </div>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <div>
            <div className={s.label}>{tw('name')}</div>
            <input className={s.input} value={name} onChange={(e) => setName(e.target.value)} data-testid="docx-name" />
          </div>
          <div className={s.muted}>{tw('mapHint', { file })}</div>
          <div className={styles.map} data-testid="docx-map">
            <div className={cx(styles.mapRow, styles.mapTh)}>
              <span>{tw('col.place')}</span>
              <span>{tw('col.var')}</span>
              <span>{tw('col.conf')}</span>
              <span />
            </div>
            {fields.map((f, i) => (
              <div key={f.placeholder + i} className={styles.mapRow} data-field={f.variable}>
                <span className={styles.ph}>{f.placeholder}</span>
                <select
                  className={s.select}
                  value={f.variable}
                  onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, variable: e.target.value, confidence: 1 } : x)))}
                  aria-label={tw('col.var') + ' ' + f.placeholder}
                >
                  {varsForKind(kind).map((v) => (
                    <option key={v.key} value={v.key}>
                      {t(`var.${v.key.replace('.', '_')}`)}
                    </option>
                  ))}
                </select>
                <span className={cx(styles.conf, f.confidence < LOW ? styles.low : styles.hi)}>{Math.round(f.confidence * PCT)}%</span>
                <button type="button" className={styles.x} onClick={() => setFields(fields.filter((_, j) => j !== i))} aria-label={tw('remove')}>
                  <Icon name="ic-x" size={14} color={color.text4} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className={s.muted}>{tw('confirm', { n: fields.length })}</div>
          <LegalChecklist kind={kind} missing={missing} />
        </>
      )}
      {err ? (
        <div className={styles.err} data-testid="doc-err">
          {err}
        </div>
      ) : null}
    </FormModal>
  );
}
