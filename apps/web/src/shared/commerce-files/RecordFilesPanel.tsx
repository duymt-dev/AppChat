// Tab Tệp thật của đơn / đề nghị (TIP-032d §3.1–3.2, §3.5): danh sách theo quyền hiện hành, "Mở" tải bytes qua route đã kiểm quyền, "+ Tải
// tệp lên" = chọn → tải staging cho đúng bản ghi → gắn (biên nhận mới hiện là đã gắn), gỡ có hộp xác nhận + cảnh báo tệp gốc vẫn giữ.
// Chứng từ đã sinh (PDF đề nghị / phiếu thu) chỉ mở / tải, không gỡ / thay. Bản gốc mất → nói thật "không còn bản gốc". Drawer chỉ truyền
// loại + id bản ghi.
'use client';
import { useRef } from 'react';
import { App, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useFmt } from '../i18n/useFmt';
import { useRecordFilesStyles } from './record-files.styles';
import { useRecordFiles } from './useRecordFiles';
import type { RecordFile, RecordRef } from './types';

const ACCEPT = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv';
const EXT_BG: Record<string, string> = { pdf: color.dangerStrong, xlsx: color.okGreen, csv: color.okGreen, docx: color.blue, png: color.violet, jpg: color.violet, jpeg: color.violet, webp: color.violet };
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase().slice(0, 4) : '');
const sizeOf = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function RecordFilesPanel({ record }: { record: RecordRef }) {
  const t = useTranslations('common.recordFiles');
  const fmt = useFmt();
  const { modal, message } = App.useApp();
  const { styles, cx } = useRecordFilesStyles();
  const x = useRecordFiles(record);
  const picker = useRef<HTMLInputElement>(null);
  const tid = `rf-${record.type}`;

  const by = (f: RecordFile) => (f.kind === 'user_attachment' ? f.created_by_name || t('member') : t('system'));
  const open = (f: RecordFile) => void x.download(f).catch(() => void message.error(t('openFail')));
  const confirmRemove = (f: RecordFile) =>
    modal.confirm({
      title: t('detachTitle', { name: f.name }),
      content: t('detachBody'),
      okText: t('detach'),
      okButtonProps: { danger: true },
      cancelText: t('cancel'),
      onOk: () => x.remove(f),
    });

  const status = () => {
    switch (x.op.kind) {
      case 'uploading':
        return <div className={styles.note} role="status">{t('uploading', { name: x.op.name })}</div>;
      case 'attaching':
        return <div className={styles.note} role="status">{t('attaching', { name: x.op.name })}</div>;
      case 'failed':
        return (
          <div className={cx(styles.note, styles.error)} role="alert" data-testid={`${tid}-error`}>
            {t('failed', { name: x.op.name, reason: t.has(`reason.${x.op.reason}`) ? t(`reason.${x.op.reason}` as never) : t('reason.failed') })}
          </div>
        );
      case 'stale':
        return <div className={cx(styles.note, styles.error)} role="alert" data-testid={`${tid}-stale`}>{t('stale')}</div>;
      default:
        return null;
    }
  };

  const body = () => {
    if (x.isLoading) return <div className={styles.empty}><Skeleton active paragraph={{ rows: 2 }} title={false} /></div>;
    if (x.isError)
      return (
        <div className={styles.empty} role="alert">
          {t('loadFail')}{' '}
          <button type="button" className={styles.btn} onClick={x.refetch}>{t('retry')}</button>
        </div>
      );
    if (!x.files.length) return <div className={styles.empty} data-testid={`${tid}-empty`}>{t('empty')}</div>;
    return x.files.map((f) => {
      const ext = extOf(f.name);
      return (
        <div key={f.attachment_id ?? f.file_id} className={styles.file} data-testid={`${tid}-row`} data-file={f.file_id} data-kind={f.kind}>
          <div className={styles.ext} style={{ background: EXT_BG[ext] ?? color.text3 }} aria-hidden>
            {ext.toUpperCase()}
          </div>
          <div className={styles.grow}>
            <div className={styles.name} title={f.name}>{f.name}</div>
            <div className={styles.meta}>
              {f.kind === 'user_attachment' ? t('meta', { by: by(f), at: fmt.date(f.created_at), size: sizeOf(f.bytes) }) : t('metaGenerated', { kind: t(`kind.${f.kind}`), at: fmt.date(f.created_at) })}
              {f.available ? null : ` · ${t('missing')}`}
            </div>
          </div>
          <button type="button" className={styles.btn} disabled={!f.available} onClick={() => open(f)} aria-label={t('openName', { name: f.name })}>
            {t('open')}
          </button>
          {f.can_detach && f.attachment_id ? (
            <button type="button" className={cx(styles.btn, styles.danger)} disabled={x.busy} onClick={() => confirmRemove(f)} aria-label={t('detachName', { name: f.name })} data-testid={`${tid}-detach`}>
              {t('detach')}
            </button>
          ) : null}
        </div>
      );
    });
  };

  return (
    <div className={styles.card} data-testid={tid}>
      <div className={styles.h}>{t('title')}</div>
      {body()}
      {x.more ? (
        <button type="button" className={styles.upload} onClick={x.more}>
          {t('more')}
        </button>
      ) : null}
      {status()}
      {x.canAttach ? (
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
            data-testid={`${tid}-input`}
          />
          <button type="button" className={styles.upload} disabled={x.busy} onClick={() => picker.current?.click()} data-testid={`${tid}-upload`}>
            {t('upload')}
          </button>
        </>
      ) : null}
    </div>
  );
}
