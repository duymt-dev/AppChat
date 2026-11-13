// Tab Tệp của drawer sản phẩm (TIP-027b §3.1, §3.4) — prototype L6073–6084 (thẻ "Tệp đính kèm", dòng tệp + "Mở", "+ Tải tệp lên").
// Thật: ảnh (PNG / JPEG / WEBP, tối đa 10) lưới xem trước qua object URL đã kiểm quyền, ảnh chính có nhãn; tài liệu (tối đa 20) dòng tệp
// mở / tải bytes thật. Quyền sửa (catalog.manage) mới thấy tải lên / đặt ảnh chính / dời / gỡ (gỡ có hộp xác nhận, tệp gốc giữ). Trạng
// thái: đang tải ≠ đang gắn ≠ đã gắn; lỗi / danh sách vừa đổi → "Thử lại" gắn đúng tệp đã tải, không tải lại. Drawer chỉ truyền sản phẩm.
'use client';
import { useRef } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { ProductMediaItemDto } from '@appchat/shared';
import { color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useRecordFilesStyles } from '@/shared/commerce-files/record-files.styles';
import { useMediaStyles } from '../styles/media.styles';
import { useProductMedia } from '../hooks/useProductMedia';
import type { Product } from '../types';

const ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.txt,.csv';
const EXT_BG: Record<string, string> = { pdf: color.dangerStrong, xlsx: color.okGreen, csv: color.okGreen, docx: color.blue, txt: color.text3 };
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase().slice(0, 4) : '');
const sizeOf = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ProductMediaEditor({ p }: { p: Product }) {
  const t = useTranslations('products.media');
  const fmt = useFmt();
  const { modal, message } = App.useApp();
  const { styles: rf, cx } = useRecordFilesStyles();
  const { styles } = useMediaStyles();
  const x = useProductMedia(p.id, p.media);
  const picker = useRef<HTMLInputElement>(null);
  const full = x.images.length >= x.limits.image && x.documents.length >= x.limits.document;

  const open = (m: ProductMediaItemDto) => void x.download(m).catch(() => void message.error(t('openFail')));
  const confirmRemove = (m: ProductMediaItemDto) =>
    modal.confirm({
      title: t('detachTitle', { name: m.name }),
      content: t('detachBody'),
      okText: t('detach'),
      okButtonProps: { danger: true },
      cancelText: t('cancel'),
      onOk: () => x.remove(m),
    });
  const reason = (r: string) => (t.has(`reason.${r}`) ? t(`reason.${r}` as never) : t('reason.failed'));

  const status = () => {
    const op = x.op;
    if (op.kind === 'uploading') return <div className={rf.note} role="status">{t('uploading', { name: op.name })}</div>;
    if (op.kind === 'attaching') return <div className={rf.note} role="status">{t('attaching', { name: op.name })}</div>;
    if (op.kind === 'idle') return null;
    const retryable = op.kind === 'stale' || !!op.fileId;
    return (
      <div className={cx(rf.note, rf.error)} role="alert" data-testid={`pd-media-${op.kind}`}>
        {op.kind === 'stale' ? t('stale', { name: op.name }) : t('failed', { name: op.name, reason: reason(op.reason) })}
        {retryable ? (
          <button type="button" className={styles.retry} onClick={x.retry} data-testid="pd-media-retry">
            {t('retry')}
          </button>
        ) : null}
      </div>
    );
  };

  const tile = (m: ProductMediaItemDto, i: number) => (
    <div key={m.media_id} className={cx(styles.tile, m.is_primary && styles.primaryTile)} data-testid="pd-media-image" data-media={m.media_id} data-primary={m.is_primary || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL tạm từ bytes đã kiểm quyền, không qua next/image */}
      {x.previews[m.file_id] ? <img className={styles.thumb} src={x.previews[m.file_id]} alt={m.name} /> : <div className={styles.thumb} role="img" aria-label={m.name} />}
      {m.is_primary ? <span className={styles.badge}>{t('primary')}</span> : null}
      <div className={styles.name} title={m.name}>{m.name}</div>
      {x.canEdit ? (
        <div className={styles.tileBar}>
          <button type="button" className={styles.icon} disabled={x.busy || i === 0} onClick={() => void x.move(m, -1)} aria-label={t('moveUp', { name: m.name })} title={t('moveUp', { name: m.name })}>{t('glyph.up')}</button>
          <button type="button" className={styles.icon} disabled={x.busy || m.is_primary} onClick={() => void x.makePrimary(m)} aria-label={t('makePrimary', { name: m.name })} title={t('makePrimary', { name: m.name })} data-testid="pd-media-primary">{t('glyph.primary')}</button>
          <button type="button" className={styles.icon} disabled={x.busy || i === x.images.length - 1} onClick={() => void x.move(m, 1)} aria-label={t('moveDown', { name: m.name })} title={t('moveDown', { name: m.name })}>{t('glyph.down')}</button>
          <button type="button" className={cx(styles.icon, rf.danger)} disabled={x.busy} onClick={() => confirmRemove(m)} aria-label={t('detachName', { name: m.name })} title={t('detachName', { name: m.name })} data-testid="pd-media-detach">{t('glyph.remove')}</button>
        </div>
      ) : null}
    </div>
  );

  const docRow = (m: ProductMediaItemDto) => {
    const ext = extOf(m.name);
    return (
      <div key={m.media_id} className={rf.file} data-testid="pd-media-doc" data-media={m.media_id}>
        <div className={rf.ext} style={{ background: EXT_BG[ext] ?? color.text3 }} aria-hidden>
          {ext.toUpperCase()}
        </div>
        <div className={rf.grow}>
          <div className={rf.name} title={m.name}>{m.name}</div>
          <div className={rf.meta}>
            {t('meta', { at: fmt.date(m.created_at), size: sizeOf(m.bytes) })}
            {m.available ? null : ` · ${t('missing')}`}
          </div>
        </div>
        <button type="button" className={rf.btn} disabled={!m.available} onClick={() => open(m)} aria-label={t('openName', { name: m.name })}>
          {t('open')}
        </button>
        {x.canEdit ? (
          <button type="button" className={cx(rf.btn, rf.danger)} disabled={x.busy} onClick={() => confirmRemove(m)} aria-label={t('detachName', { name: m.name })} data-testid="pd-media-detach">
            {t('detach')}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className={rf.card} data-testid="pd-media">
      <div className={rf.h}>{t('title')}</div>
      {!x.images.length && !x.documents.length ? <div className={rf.empty} data-testid="pd-media-empty">{t('empty')}</div> : null}
      {x.images.length ? (
        <>
          <div className={styles.sub}>{t('images', { n: x.images.length, max: x.limits.image })}</div>
          <div className={styles.grid}>{x.images.map(tile)}</div>
        </>
      ) : null}
      {x.documents.length ? (
        <>
          <div className={styles.sub}>{t('documents', { n: x.documents.length, max: x.limits.document })}</div>
          {x.documents.map(docRow)}
        </>
      ) : null}
      {status()}
      {x.canEdit ? (
        <>
          <input
            ref={picker}
            type="file"
            hidden
            accept={ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void x.upload(f);
            }}
            data-testid="pd-media-input"
          />
          <button type="button" className={rf.upload} disabled={x.busy || full} onClick={() => picker.current?.click()} data-testid="pd-media-upload">
            {full ? t('full') : t('upload')}
          </button>
        </>
      ) : null}
    </div>
  );
}
