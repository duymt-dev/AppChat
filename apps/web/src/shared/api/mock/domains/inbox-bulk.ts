// Mock thao tác hàng loạt + alias của Hộp thư (TIP-025b §C) cùng luật server: conversation.bulk_update luôn xem trước, ≤ 50 → kết quả TỪNG
// hội thoại (id không có → lỗi riêng, mã an toàn), > 50 → 202 job_accepted. Alias "bỏ" (unhide / untag / unpin / unreact) là trạng thái
// mong muốn: chưa có thì không đổi gì, không bao giờ bật lại.
import { BULK_SYNC_MAX } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

type Ci = { conversation_id: string };
type Mi = Ci & { message_id: string };
type BulkIn = { conversation_ids: string[]; add_tags?: string[]; assignee_user_id?: string; status?: 'open' | 'pending' | 'closed'; archive?: boolean };
type Item = { id: string; status: 'done' | 'skipped' | 'failed'; error: string | null };

let jobSeq = 0;
const find = (db: MockDb, id: string) => db.inbox.conversations.find((c) => c.id === id);

function applyOne(db: MockDb, id: string, i: BulkIn): Item {
  const c = find(db, id);
  if (!c) return { id, status: 'failed', error: 'NOT_FOUND:conversation_id' };
  const before = JSON.stringify(c);
  if (i.assignee_user_id) c.assignee = i.assignee_user_id;
  if (i.status) c.status = i.status;
  if (i.archive !== undefined) c.archived = i.archive;
  for (const label of i.add_tags ?? []) if (!c.tags.some((t) => t.label === label)) c.tags.push({ label, tone: 'channel' });
  return { id, status: JSON.stringify(c) === before ? 'skipped' : 'done', error: null };
}

export const inboxBulkHandlers: Record<string, MockHandler> = {
  'conversation.bulk_update': {
    preview: (_db, i: BulkIn) => {
      const n = new Set(i.conversation_ids).size;
      return { summary: `${n}`, count: n };
    },
    execute: (db, i: BulkIn) => {
      const ids = [...new Set(i.conversation_ids)];
      if (ids.length > BULK_SYNC_MAX) {
        const id = `0190f000-0000-7000-8000-${String(0xb000 + ++jobSeq).padStart(12, '0')}`;
        for (const x of ids) applyOne(db, x, i);
        return { updated: 0, failed: 0, items: [], __accepted: { job_id: id, status_url: `/v1/data-jobs/${id}` } };
      }
      const items = ids.map((x) => applyOne(db, x, i));
      return { updated: items.filter((x) => x.status === 'done').length, failed: items.filter((x) => x.status === 'failed').length, items };
    },
  },
  'conversation.unhide': {
    execute: (db, i: Ci) => {
      const c = find(db, i.conversation_id);
      if (c) c.hidden = false;
      return { hidden: false };
    },
  },
  'conversation.untag': {
    execute: (db, i: Ci & { tag: string }) => {
      const c = find(db, i.conversation_id);
      if (!c) return { tags: [] };
      c.tags = c.tags.filter((t) => t.label.toLowerCase() !== i.tag.trim().toLowerCase());
      return { tags: c.tags.map((t) => t.label) };
    },
  },
  'message.unpin': {
    execute: (db, i: Mi) => {
      const c = find(db, i.conversation_id);
      if (c && c.pinned_message_id === i.message_id) c.pinned_message_id = null;
      return { pinned: false };
    },
  },
  'message.unreact': {
    execute: (db, i: Mi) => {
      const m = db.inbox.messages[i.conversation_id]?.find((x) => x.id === i.message_id);
      if (m) m.reaction = null;
      return { emoji: null };
    },
  },
};
