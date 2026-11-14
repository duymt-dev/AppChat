// Modal "Nhập từ tệp" (TIP-032b) — không có prototype: dùng ModalShell + token của form sản phẩm. Bước: chọn tệp CSV / XLSX → ánh xạ cột
// (tên cột tiêu đề; CSV gợi ý theo dòng đầu — cột tuỳ chọn không có trong tệp để trống) → Nhập (xem trước qua ConfirmActionHost) → tiến độ + số tạo / cập nhật / lỗi.
// Đang chạy: Huỷ (dòng đã ghi giữ nguyên); lỗi / đã huỷ: Chạy lại (chỉ dòng chưa ghi).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { importDone } from '@appchat/shared';
import { useProductsUi } from '../products-store';
import { useProductFormStyles } from '../styles/form.styles';
import { useProductImport, type ImportMapping } from '../hooks/useProductImport';

const FIELDS = ['name', 'price', 'sku', 'type', 'category', 'unit', 'tax_rate'] as const;
const DEFAULTS: Record<(typeof FIELDS)[number], string> = { name: 'Tên', price: 'Giá', sku: 'Mã', type: 'Loại', category: 'Danh mục', unit: 'Đơn vị', tax_rate: 'Thuế' };
const REQUIRED = new Set(['name', 'price']);

/** Gợi ý ánh xạ theo tiêu đề tệp: cột bắt buộc giữ tên gợi ý, cột tuỳ chọn chỉ điền khi tệp có cột đó (server 422 nếu ánh xạ cột không có). */
const fit = (header: string[] | null) => {
  if (!header) return Object.fromEntries(FIELDS.map((k) => [k, REQUIRED.has(k) ? DEFAULTS[k] : ''])) as Record<string, string>;
  const has = (n: string) => header.find((h) => h.toLowerCase() === n.toLowerCase());
  return Object.fromEntries(FIELDS.map((k) => [k, has(DEFAULTS[k]) ?? (REQUIRED.has(k) ? DEFAULTS[k] : '')])) as Record<string, string>;
};

export function ProductImportModal() {
  const t = useTranslations('products.import');
  const { styles, cx } = useProductFormStyles();
  const set = useProductsUi((s) => s.set);
  const imp = useProductImport();
  const [map, setMap] = useState<Record<string, string>>(DEFAULTS);
  const s = imp.status;
  const close = () => set({ importOpen: false });
  const mapping = (): ImportMapping => ({ ...Object.fromEntries(Object.entries(map).filter(([, v]) => v.trim())), name: map.name ?? '', price: map.price ?? '' }) as ImportMapping;

  return (
    <ModalShell
      open
      onClose={close}
      width={560}
      flush
      dense
      title={
        <>
          {t('title')}
          <div className={styles.sub}>{t('sub')}</div>
        </>
      }
      icon="ic-doc"
      iconColor={color.teal}
      iconBg={color.tealBg}
      closeLabel={t('close')}
      testId="pd-import"
      footer={
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={close}>
            {t('close')}
          </button>
          {s && !importDone(s.status) ? (
            <button type="button" className={styles.cancel} onClick={() => void imp.cancel()} data-testid="pd-import-cancel">
              {t('cancelRun')}
            </button>
          ) : null}
          {s && (s.status === 'failed' || s.status === 'cancelled') ? (
            <button type="button" className={styles.cancel} onClick={() => void imp.retry()} data-testid="pd-import-retry">
              {t('retry')}
            </button>
          ) : null}
          <button type="button" className={styles.save} disabled={!imp.file || imp.pending || (!!s && !importDone(s.status))} onClick={() => void imp.run(mapping())} data-testid="pd-import-run">
            <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
            {t('run')}
          </button>
        </div>
      }
    >
      <div className={cx(styles.grid, styles.head)}>
        <div className={styles.wide}>
          <label className={styles.label}>{t('file')}</label>
          <input
            className={styles.input}
            type="file"
            accept=".csv,.xlsx"
            disabled={imp.uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void imp.upload(f).then((h) => setMap(fit(h)));
            }}
            data-testid="pd-import-file"
          />
          <div className={styles.hint}>{imp.file ? t('picked', { name: imp.file.name }) : t('fileHint')}</div>
        </div>
        {FIELDS.map((k) => (
          <div key={k}>
            <label className={styles.label}>{t(`map.${k}`)}</label>
            <input className={styles.input} value={map[k] ?? ''} onChange={(e) => setMap({ ...map, [k]: e.target.value })} data-testid={`pd-import-map-${k}`} />
          </div>
        ))}
      </div>
      {s ? (
        <div className={styles.head} data-testid="pd-import-status">
          <div className={styles.secTitle}>{t(`status.${s.status}`)}</div>
          <div className={styles.hint}>{t('progress', { processed: s.processed, total: s.total, created: s.created, updated: s.updated, failed: s.failed })}</div>
        </div>
      ) : null}
    </ModalShell>
  );
}
