// "Nhập" khách hàng (REQ-F03, DC-147 — prototype chỉ có nút L2460): chọn tệp CSV / XLSX → tải lên (purpose `import`) → server đọc
// bảng sheet đầu → ghép cột tự động (sửa được) + xem trước 5 dòng → contact.import theo lô ≤ 500 (mỗi lô qua preview đếm tạo /
// trùng / của người khác / lỗi) → tổng kết. Hoàn tác từng lô ở Nhật ký (undo 24h). Trùng khách của người khác chỉ đếm (D32).
'use client';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { useFormStyles } from '../styles/form.styles';
import { useImportStyles } from '../styles/import.styles';
import { useCrmUi } from '../crm-store';
import { importTableQuery } from '../api';
import { IMPORT_FIELDS, batches, guessMapping, toImportRows } from '../import-map';

type Result = { created: number; duplicates: number; owned: number; invalid: number };
const ZERO: Result = { created: 0, duplicates: 0, owned: 0, invalid: 0 };
const KEYS = Object.keys(ZERO) as (keyof Result)[];
const NAME = IMPORT_FIELDS[0];

export function ImportModal() {
  const t = useTranslations('customers.importer');
  const tf = useTranslations('customers.form');
  const { styles: fs, cx } = useFormStyles();
  const { styles: s } = useImportStyles();
  const ui = useCrmUi();
  const qc = useQueryClient();
  const run = useAction<Result>('contact.import');
  const input = useRef<HTMLInputElement>(null);
  const [fileId, setFileId] = useState('');
  const [err, setErr] = useState('');
  const [mapping, setMapping] = useState<string[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const table = useQuery(importTableQuery(fileId));
  const close = () => ui.set({ modal: null, target: null });
  const map = mapping ?? (table.data ? guessMapping(table.data.columns) : []);
  const rows = table.data ? toImportRows(table.data.rows, map) : [];
  const label = (f: string) => tf(f === 'full_name' ? 'name' : f === 'title' ? 'role' : (f as never));

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    setMapping(null);
    setBusy(true);
    try {
      setFileId((await transport.upload(f, 'import')).file_id);
    } catch {
      setErr(t('uploadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    const sum = { ...ZERO };
    for (const b of batches(rows)) {
      const r = await run.run({ rows: b }, { silent: true });
      if (!r) break;
      KEYS.forEach((k) => (sum[k] += r.result[k]));
    }
    setBusy(false);
    setResult(sum);
    void qc.invalidateQueries({ queryKey: ['crm'] });
  };

  const failed = table.isError || (table.data && !table.data.columns.length);
  // Lý do 422 của server (quá nhiều dòng / tệp quá phức tạp) — khác "không đọc được".
  const reason = (table.error as { error?: { fields?: Record<string, string> } } | null)?.error?.fields?.file_id;
  const failText = reason === 'too_many_rows' ? t('tooManyRows') : reason === 'too_many_sheets' ? t('tooComplex') : t('unreadable');
  return (
    <ModalShell
      open
      onClose={close}
      width={720}
      title={t('title')}
      icon="ic-download"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('close')}
      testId="crm-import"
      footer={
        result ? (
          <button type="button" className={cx(fs.btn, fs.primary)} onClick={close}>
            {t('done')}
          </button>
        ) : (
          <>
            <button type="button" className={fs.btn} onClick={close}>
              {t('cancel')}
            </button>
            <button type="button" className={cx(fs.btn, fs.primary)} disabled={!rows.length || busy} onClick={() => void submit()} data-testid="import-submit">
              {t('submit', { count: rows.length })}
            </button>
          </>
        )
      }
    >
      {result ? (
        <div className={s.result} data-testid="import-result">
          {KEYS.map((k) => (
            <div key={k} className={s.stat} data-stat={k}>
              <b>{result[k]}</b>
              {t(`result.${k}`)}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={s.drop}>
            <Icon name="ic-download" size={22} color={color.text3} />
            {t('hint')}
            <button type="button" className={cx(fs.btn, s.pick)} disabled={busy} onClick={() => input.current?.click()} data-testid="import-pick">
              {t('pick')}
            </button>
            <input ref={input} type="file" hidden accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => void pick(e.target.files?.[0])} data-testid="import-file" />
          </div>
          {err || failed ? <div className={fs.err} data-testid="import-error">{err || failText}</div> : null}
          {table.data && table.data.columns.length ? (
            <>
              <div className={fs.sectionTitle}>{t('mapTitle', { rows: table.data.total })}</div>
              <div className={s.map}>
                {table.data.columns.map((c, i) => (
                  <label key={`${c}-${i}`} className={fs.field}>
                    <span className={s.col}>{c}</span>
                    <select className={fs.input} value={map[i] ?? ''} aria-label={c} onChange={(e) => setMapping(map.map((m, j) => (j === i ? e.target.value : m === e.target.value ? '' : m)))}>
                      <option value="">{t('skip')}</option>
                      {IMPORT_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {label(f)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {!map.includes(NAME) ? <div className={fs.err}>{t('needName')}</div> : null}
              <div className={fs.sectionTitle}>{t('preview')}</div>
              <div className={s.scroll}>
                <table className={s.table} data-testid="import-preview">
                  <thead>
                    <tr>
                      {IMPORT_FIELDS.filter((f) => map.includes(f)).map((f) => (
                        <th key={f}>{label(f)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {IMPORT_FIELDS.filter((f) => map.includes(f)).map((f) => (
                          <td key={f}>{r[f] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      )}
    </ModalShell>
  );
}
