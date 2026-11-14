// Bảng tin nhóm (TIP-025b §A.7) — prototype L1941–1990: tin ghim + ghi chú nội bộ + Ảnh/Video · File · Link đọc thật theo trang
// (GET /conversations/:id/group/board), không ô màu giả. "Xem tất cả" tải trang kế; tổng chưa biết thì không bịa số. Link chỉ http(s),
// hiện chữ thoát HTML, mở tab mới không gửi referrer (không tự tải trước). Ghi chú = tin note của chính hội thoại (note.add), không phải CRM.
'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { GroupBoardItemDto, GroupBoardKind } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useGroupStyles } from '../styles/group.styles';
import { groupBoardQuery } from '../group-api';
import { GroupFold as Fold } from './GroupFold';

const EXT: Record<string, string> = { pdf: color.dangerStrong, xlsx: color.okStrong, sheet: color.okStrong, docx: color.blue, word: color.blue };
const safeUrl = (u?: string) => (u && /^https?:\/\//i.test(u) ? u : undefined);
/** Ảnh nhỏ: link ký http(s) hoặc ảnh nhúng `data:image/` (chỉ cho <img>, không bao giờ thành href). */
const imgUrl = (u?: string) => safeUrl(u) ?? (u && /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/i.test(u) ? u : undefined);
const extOf = (it: GroupBoardItemDto) => (it.name?.split('.').pop() ?? it.mime?.split('/').pop() ?? '').slice(0, 4).toUpperCase();
const kb = (n?: number) => (n == null ? '' : n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function useBoard(id: string, kind: GroupBoardKind, enabled: boolean) {
  const q = useInfiniteQuery(groupBoardQuery(id, kind, enabled));
  return { ...q, items: q.data?.pages.flatMap((p) => p.items) ?? [], pinned: q.data?.pages[0]?.pinned ?? null };
}

function More({ q }: { q: ReturnType<typeof useBoard> }) {
  const t = useTranslations('inbox.group');
  const { styles } = useGroupStyles();
  if (q.isError) return <div className={styles.empty}>{t('boardError')}</div>;
  if (q.isLoading) return <div className={styles.empty}>{t('boardLoading')}</div>;
  if (!q.items.length) return <div className={styles.empty}>{t('boardEmpty')}</div>;
  if (!q.hasNextPage) return null;
  return (
    <div className={styles.seeAllWrap}>
      <button type="button" className={styles.seeAll} onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
        {t('seeAll')}
      </button>
    </div>
  );
}

export function GroupBoard({ convId }: { convId: string }) {
  const t = useTranslations('inbox.group');
  const fmt = useFmt();
  const { styles } = useGroupStyles();
  const [open, setOpen] = useState({ notes: false, media: true, files: true, links: true });
  const toggle = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const media = useBoard(convId, 'media', open.media);
  const files = useBoard(convId, 'files', open.files);
  const links = useBoard(convId, 'links', open.links);
  const notes = useBoard(convId, 'notes', open.notes);
  const pinned = media.pinned ?? files.pinned ?? links.pinned;
  const count = (q: ReturnType<typeof useBoard>) => (q.data ? t(q.hasNextPage ? 'countMore' : 'mediaCount', { n: q.items.length }) : undefined);

  return (
    <>
      <div className={styles.gap} />
      <div className={styles.block} data-testid="group-board">
        <div className={styles.boardTitle}>{t('board')}</div>
        <div className={styles.row}>
          <Icon name="ic-pin" size={18} color={color.groupInk} />
          <div className={styles.grow}>
            <div className={styles.label}>{t('pinned')}</div>
            <div className={styles.sub} data-testid="group-pinned">{pinned?.text || t('pinnedNone')}</div>
          </div>
        </div>
        <button type="button" className={styles.row} onClick={() => toggle('notes')} aria-expanded={open.notes} data-testid="group-notes">
          <Icon name="ic-doc" size={18} color={color.groupInk} />
          <div className={styles.grow}>
            <div className={styles.label}>{t('notes')}</div>
            <div className={styles.sub}>{t('notesSub')}</div>
          </div>
        </button>
        {open.notes ? (
          <>
            {notes.items.map((n) => (
              <div key={n.message_id} className={styles.noteRow}>
                <div className={styles.noteText}>{n.text}</div>
                <div className={styles.sub}>{n.sender} · {fmt.date(n.at)}</div>
              </div>
            ))}
            <More q={notes} />
          </>
        ) : null}
      </div>
      <Fold title={t('media')} meta={count(media)} open={open.media} onToggle={() => toggle('media')}>
        <div className={styles.media} data-testid="group-media">
          {media.items.map((m) =>
            imgUrl(m.url) ? (
              <a key={m.message_id} href={safeUrl(m.url)} target="_blank" rel="noopener noreferrer" title={m.name} className={styles.tile}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh qua link ký của luồng tin, không qua next/image */}
                <img src={imgUrl(m.url)} alt={m.name ?? ''} className={styles.tileImg} loading="lazy" referrerPolicy="no-referrer" />
              </a>
            ) : (
              <div key={m.message_id} title={m.name} className={styles.tileName}>
                {m.name}
              </div>
            ),
          )}
        </div>
        <More q={media} />
      </Fold>
      <Fold title={t('files')} meta={count(files)} open={open.files} onToggle={() => toggle('files')}>
        {files.items.map((f) => (
          <a key={f.message_id} className={styles.row} href={safeUrl(f.url)} target="_blank" rel="noopener noreferrer" data-testid="group-file">
            {/* màu theo loại tệp — giá trị động */}
            <div className={styles.ext} style={{ background: EXT[extOf(f).toLowerCase()] ?? color.text3 }}>
              {extOf(f)}
            </div>
            <div className={styles.grow}>
              <div className={styles.label}>{f.name}</div>
              <div className={styles.sub}>{[f.sender, fmt.date(f.at), kb(f.size)].filter(Boolean).join(' · ')}</div>
            </div>
          </a>
        ))}
        <More q={files} />
      </Fold>
      <Fold title={t('links')} meta={count(links)} open={open.links} onToggle={() => toggle('links')}>
        {links.items.map((l, i) => (
          <a key={`${l.message_id}-${i}`} className={styles.row} href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer nofollow" data-testid="group-link-item">
            <span className={styles.linkIcon}>
              <Icon name="ic-globe" size={16} color={color.groupSub} />
            </span>
            <div className={styles.grow}>
              <div className={styles.label}>{l.text || l.sender}</div>
              <div className={styles.link}>{l.url?.replace(/^https?:\/\//i, '')}</div>
            </div>
          </a>
        ))}
        <More q={links} />
      </Fold>
    </>
  );
}
