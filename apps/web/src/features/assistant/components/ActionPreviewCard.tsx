// Thẻ xác nhận của Trợ lý — prototype L1260 ActionCard + TIP-023b R2.8: hiện đổi gì theo ActionPreview chuẩn (`changes` trước → sau, số bản
// ghi, cảnh báo), nút Sửa mở form theo khuôn input (REQ-E03b — chỉ xem trước lại). Trạng thái: chờ / đã lưu (mở kết quả) / đã huỷ / đã
// chuyển chờ duyệt (chưa thực hiện — không báo xong).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useThreadStyles } from '../styles/thread.styles';
import type { ActionPreview, ChatMessage } from '../types';
import { EditActionPreviewModal } from './EditActionPreviewModal';

export interface ActionPreviewCardProps {
  m: ChatMessage;
  onDecide: (m: ChatMessage, d: 'confirm' | 'cancel') => void;
  onOpen: (m: ChatMessage) => void;
}

const MAX_ROWS = 6;
const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Dòng "ô: trước → sau" của các thay đổi (tạo: chỉ sau; xoá: chỉ trước). */
function rowsOf(p: ActionPreview | undefined) {
  const out: { key: string; field: string; before?: string; after?: string }[] = [];
  for (const [i, c] of (p?.changes ?? []).entries()) {
    const fields = new Set([...Object.keys(c.before ?? {}), ...Object.keys(c.after ?? {})]);
    for (const f of fields) {
      out.push({
        key: `${i}.${f}`,
        field: f,
        ...(c.before && f in c.before ? { before: show(c.before[f]) } : {}),
        ...(c.after && f in c.after ? { after: show(c.after[f]) } : {}),
      });
    }
  }
  return out;
}

export function ActionPreviewCard({ m, onDecide, onOpen }: ActionPreviewCardProps) {
  const t = useTranslations('assistant');
  const { styles } = useThreadStyles();
  const [editing, setEditing] = useState(false);
  const c = m.card!;
  const cancelled = m.status === 'cancelled';
  const rows = rowsOf(c.preview);
  const canEdit = m.status === 'pending' && !!c.schema && Object.keys(c.schema).length > 0;
  return (
    <div className={styles.card} style={{ borderColor: cancelled ? color.border : c.color, opacity: cancelled ? 0.6 : 1 }} data-testid="asst-card" data-status={m.status}>
      <div className={styles.cardHead} style={{ background: `${c.color}10` }}>
        <span className={styles.cardIcon} style={{ background: `${c.color}20` }}>
          <Icon name={c.icon as IconName} size={16} color={c.color} />
        </span>
        <div>
          <div className={styles.cardTitle}>{c.title}</div>
          <div className={styles.cardDesc}>{c.desc}</div>
        </div>
      </div>
      {rows.length || c.preview?.count || c.preview?.warnings?.length ? (
        <div className={styles.changes} data-testid="asst-card-changes">
          {rows.slice(0, MAX_ROWS).map((r) => (
            <div key={r.key} className={styles.change} data-field={r.field}>
              <span className={styles.changeField}>{r.field}</span>
              {r.before !== undefined ? <span className={styles.before}>{r.before}</span> : null}
              {r.before !== undefined && r.after !== undefined ? <Icon name="ic-arrow" size={12} color={color.text4} /> : null}
              {r.after !== undefined ? <span className={styles.after}>{r.after}</span> : null}
            </div>
          ))}
          {rows.length > MAX_ROWS ? <div className={styles.cardDesc}>{t('preview.more', { n: rows.length - MAX_ROWS })}</div> : null}
          {c.preview?.count ? <div className={styles.cardDesc}>{t('preview.count', { n: c.preview.count })}</div> : null}
          {c.preview?.warnings?.map((w) => (
            <div key={w} className={styles.warn} data-warning={w}>
              <Icon name="ic-help" size={12} color={color.amberText} />
              {t.has(`preview.warn.${w.split(':')[0]}` as never) ? t(`preview.warn.${w.split(':')[0]}` as never) : w}
            </div>
          ))}
        </div>
      ) : null}
      {m.status === 'pending' ? (
        <div className={styles.cardFoot}>
          <button type="button" className={styles.ok} onClick={() => onDecide(m, 'confirm')}>
            <Icon name="ic-check" size={13} color={color.white} strokeWidth={2.4} />
            {t('confirm')}
          </button>
          {canEdit ? (
            <button type="button" className={styles.no} onClick={() => setEditing(true)} data-testid="asst-card-edit">
              {t('preview.edit')}
            </button>
          ) : null}
          <button type="button" className={styles.no} onClick={() => onDecide(m, 'cancel')}>
            {t('cancel')}
          </button>
        </div>
      ) : null}
      {m.status === 'done' ? (
        <button type="button" className={styles.done} style={{ background: `${c.color}0D`, color: c.color }} onClick={() => onOpen(m)}>
          <Icon name="ic-check" size={14} strokeWidth={2.2} />
          {t('saved', { dest: c.dest })}
          <span style={{ flex: 1 }} />
          <Icon name="ic-arrow" size={14} strokeWidth={2.2} />
        </button>
      ) : null}
      {m.status === 'approval' ? (
        <div className={styles.cancelled} data-testid="asst-card-approval">
          {t('preview.approval')}
        </div>
      ) : null}
      {cancelled ? <div className={styles.cancelled}>{t('cancelled')}</div> : null}
      {editing ? <EditActionPreviewModal m={m} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
