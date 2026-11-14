// Nguồn nội dung của form tạo hợp đồng (TIP-030b spec 18; COMMERCE §9 hai nguồn). Mặc định "Từ mẫu" (mẫu theo loại) — form giữ đúng
// prototype crmForm; chọn tệp ở ô "File hợp đồng" (đã có trong prototype) chuyển sang "Tải file lên": tải lên → kiểm tệp (guard server) →
// bảng đề xuất giá trị để người dùng "Dùng" từng ô. Lỗi nêu lý do + Thử lại; "Dùng mẫu theo loại" quay về nguồn mẫu (gap-filling §2).
'use client';
import { useTranslations } from 'next-intl';
import { useContractFormStyles } from '../../styles/form.styles';
import { useSourceStyles } from '../../styles/source.styles';
import { SOURCE_ACCEPT, type useContractSource } from '../../hooks/useContractSource';
import type { Inspection } from '../../types';
import { ExtractionPreview } from './ExtractionPreview';

type Source = ReturnType<typeof useContractSource>;
/** Lý do từ chối có chữ riêng; còn lại → "không kiểm được tệp". */
const KNOWN = new Set(['too_large', 'unsupported_type', 'not_pdf', 'not_docx', 'encrypted', 'macro', 'active_content', 'embedded_file', 'embedded_object', 'external_relationship', 'field_code', 'zip_bomb', 'path_traversal', 'too_many_pages', 'upload_failed']);

/** Ô chọn tệp hợp đồng (thay ô `file` cũ của form): chọn tệp = nguồn "Tải file lên". */
export function ContractFileInput({ src }: { src: Source }) {
  const { styles: f, cx } = useContractFormStyles();
  return (
    <input
      type="file"
      accept={SOURCE_ACCEPT}
      className={cx(f.input, f.file)}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void src.pick(file);
      }}
      data-testid="ct-source-file"
    />
  );
}

/** Trạng thái nguồn tệp (chỉ khi đã chọn tệp): tiến độ / lỗi + thử lại / đề xuất giá trị / quay về mẫu. */
export function ContractSourceStep({ src, onUse }: { src: Source; onUse: (field: keyof Inspection['fields'], value: string) => void }) {
  const t = useTranslations('contracts.source');
  const { styles: f, cx } = useContractFormStyles();
  const { styles } = useSourceStyles();
  if (src.kind !== 'file') return null;
  const state = src.phase === 'uploading' ? t('uploading') : src.phase === 'inspecting' ? t('inspecting') : src.phase === 'ready' ? t('ready', { name: src.file?.name ?? '' }) : t('fileHint');
  return (
    <div className={styles.panel} data-testid="ct-source">
      <div className={styles.line}>
        <span data-testid="ct-source-state">{state}</span>
        <button type="button" className={styles.link} onClick={() => src.setKind('template')} data-testid="ct-source-template">
          {t('useTemplate')}
        </button>
      </div>
      {src.phase === 'error' ? (
        <div className={cx(f.err, styles.errRow)} data-testid="ct-source-err">
          <span>{KNOWN.has(src.error) ? t(`err.${src.error}` as never) : t('err.failed')}</span>
          <button type="button" className={f.btn} onClick={() => void src.retry()} data-testid="ct-source-retry">
            {t('retry')}
          </button>
        </div>
      ) : null}
      {src.inspection ? <ExtractionPreview x={src.inspection} onUse={onUse} /> : null}
    </div>
  );
}
