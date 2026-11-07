// TIP-025b P2 — §B.1–2: tìm có trang trong ảnh chụp + cửa sổ quanh tin. 5.000 tin / 300 khớp (dựng sẵn / tổ hợp NFD / emoji, cùng
// thời điểm): tổng đúng (không chặn 200), trang 50 theo cursor mờ đủ 300 không trùng; tin mới sau ảnh chụp không chen vào trang sau; tô
// đúng vị trí UTF-16 gốc. Cửa sổ ≤ 51 quanh tin cũ (không lật trang tuần tự), cursor hai phía nối tiếp được. Tin xoá / thu hồi / trước mốc
// xoá lịch sử / hội thoại khác / ngoài scope → 404 không lộ; trích dẫn trả lời tin trước mốc xoá lịch sử không lộ thân.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { threadAroundSchema, threadSearchPageSchema } from '@appchat/shared';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { uuidv7 } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';
import { call, env } from './setup';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
let m: Matrix;
let conv = '';
let account = '';
const hitIds: string[] = [];
let oldHit = '';

const get = async (path: string, who?: { token: string }) => {
  const r = await call(m.h, path, undefined, who ? { authorization: `Bearer ${who.token}` } : {});
  return { status: r.status, body: (await r.json()) as Body };
};
const NFD = 'Khách hỏi giá triệt lông'.normalize('NFD');

beforeAll(async () => {
  m = await matrix('conversation.mark_read');
  const c = await m.conv({ title: 'Thread window', assignee: m.h.user });
  conv = c.id;
  account = c.account;
  const db = await m.db();
  const base = m.h.clock.now().getTime() - 5000 * 60_000;
  const rows = Array.from({ length: 5000 }, (_, i) => {
    const hit = [7, 31, 44, 45, 46, 47].includes(i % 50); // 6 / 50 tin đầu 2.500 tin → 300 khớp
    const kind = i % 3;
    const body = hit && i < 2500 ? (kind === 0 ? `Em báo giá triệt lông 😀 #${i}` : kind === 1 ? `${NFD} #${i}` : `GIÁ TRIỆT LÔNG mùa hè #${i}`) : `tin thường số ${i}`;
    // Hai tin liền nhau cùng thời điểm (keyset phải xét id).
    return { id: uuidv7(base + Math.floor(i / 2) * 60_000), conversationId: conv, channelAccountId: account, direction: 'in' as const, senderType: 'contact' as const, senderId: 'k', kind: 'text' as const, body, externalMsgId: `tw-${i}`, status: 'delivered' as const, createdAt: new Date(base + Math.floor(i / 2) * 60_000) };
  });
  await db.message.createMany({ data: rows });
  for (const r of rows) if (r.body.includes('#') && !r.body.startsWith('tin')) hitIds.push(r.id);
  oldHit = hitIds[3]!;
}, 240_000);
afterAll(() => m?.close());

describe('tìm có trang (§B.1)', () => {
  it('tổng đúng 300 (không chặn 200); 6 trang × 50 theo cursor đủ 300 không trùng; tô đúng chuỗi gốc', async () => {
    expect(hitIds).toHaveLength(300);
    const seen: string[] = [];
    let cursor: string | null = null;
    let snap = '';
    let pages = 0;
    do {
      const r = await get(`/conversations/${conv}/messages/search-page?q=triet long&limit=50${cursor ? `&cursor=${cursor}` : ''}`);
      expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBe(200);
      const pg = threadSearchPageSchema.parse(r.body);
      expect(pg.total).toBe(300);
      if (snap) expect(pg.snapshot_at).toBe(snap);
      snap = pg.snapshot_at;
      for (const h of pg.data) {
        seen.push(h.message_id);
        const [s, e] = h.ranges[0]!;
        expect(h.body.slice(s, e).normalize('NFC').toLowerCase()).toBe('triệt lông');
      }
      cursor = pg.next_cursor;
      pages++;
      if (pages === 1) {
        // Tin mới sau ảnh chụp: không chen vào các trang sau của cùng ảnh chụp.
        const db = await m.db();
        await db.message.create({ data: { id: uuidv7(), conversationId: conv, channelAccountId: account, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body: 'triệt lông mới', externalMsgId: `tw-new`, status: 'delivered', createdAt: new Date(m.h.clock.now().getTime() + 60_000) } });
      }
    } while (cursor);
    expect(pages).toBe(6);
    expect(new Set(seen).size).toBe(300);
    expect(seen).toEqual(hitIds);
  });

  it('lọc người gửi; đổi câu giữ cursor cũ → 400; q rỗng / > 100 / limit > 50 → 400; hội thoại ngoài scope → 404', async () => {
    expect(threadSearchPageSchema.parse((await get(`/conversations/${conv}/messages/search-page?q=triet long&sender=user`)).body).total).toBe(0);
    const first = threadSearchPageSchema.parse((await get(`/conversations/${conv}/messages/search-page?q=triet long`)).body);
    expect((await get(`/conversations/${conv}/messages/search-page?q=gia&cursor=${first.next_cursor}`)).status).toBe(400);
    expect((await get(`/conversations/${conv}/messages/search-page?q=`)).status).toBe(400);
    expect((await get(`/conversations/${conv}/messages/search-page?q=${'a'.repeat(101)}`)).status).toBe(400);
    expect((await get(`/conversations/${conv}/messages/search-page?q=gia&limit=51`)).status).toBe(400);
    expect((await get(`/conversations/${conv}/messages/search-page?q=gia`, m.sales)).status).toBe(404);
  });

  it('endpoint mảng cũ vẫn tương thích (tô theo chuỗi gốc)', async () => {
    const r = await get(`/conversations/${conv}/messages/search?q=triet long`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });
});

describe('cửa sổ quanh tin (§B.2)', () => {
  it('≤ 51 tin quanh tin cũ, tin đích ở giữa; cursor before / after nối tiếp trang thường', async () => {
    const r = await get(`/conversations/${conv}/messages/around/${oldHit}`);
    expect(r.status).toBe(200);
    const w = threadAroundSchema.parse(r.body);
    const msgs = w.data.filter((x) => x.kind !== 'date');
    expect(msgs.length).toBeLessThanOrEqual(51);
    expect(msgs.map((x) => x.id)).toContain(oldHit);
    expect(w.before_cursor).toBeTruthy();
    expect(w.after_cursor).toBeTruthy();
    const older = await get(`/conversations/${conv}/messages?cursor=${w.before_cursor}`);
    const newer = await get(`/conversations/${conv}/messages?after=${w.after_cursor}`);
    const ids = new Set(msgs.map((x) => x.id));
    for (const x of [...older.body.data, ...newer.body.data].filter((x: Body) => x.kind !== 'date')) expect(ids.has(x.id)).toBe(false);
    expect(newer.body.after_cursor).toBeTruthy();
  });

  it('tin xoá / thu hồi / id lạ / hội thoại khác / ngoài scope → 404', async () => {
    const db = await m.db();
    await db.message.update({ where: { id: hitIds[10]! }, data: { deletedAt: new Date() } });
    await db.message.update({ where: { id: hitIds[11]! }, data: { recalledAt: new Date() } });
    expect((await get(`/conversations/${conv}/messages/around/${hitIds[10]}`)).status).toBe(404);
    expect((await get(`/conversations/${conv}/messages/around/${hitIds[11]}`)).status).toBe(404);
    expect((await get(`/conversations/${conv}/messages/around/${uuidv7()}`)).status).toBe(404);
    const other = await m.conv({ title: 'TW other' });
    expect((await get(`/conversations/${other.id}/messages/around/${oldHit}`)).status).toBe(404);
    expect((await get(`/conversations/${conv}/messages/around/${oldHit}`, m.sales)).status).toBe(404);
  });

  it('sau xoá lịch sử: tin cũ → 404, tìm không thấy; trích dẫn tin trước mốc không lộ thân', async () => {
    const db = await m.db();
    const c2 = await m.conv({ title: 'TW cleared', assignee: m.h.user });
    const old = await db.message.findFirstOrThrow({ where: { conversationId: c2.id } });
    await db.conversation.update({ where: { id: c2.id }, data: { clearedAt: new Date(m.h.clock.now().getTime() + 1000) } });
    const reply = uuidv7();
    await db.message.create({ data: { id: reply, conversationId: c2.id, channelAccountId: c2.account, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body: 'trả lời', replyToId: old.id, externalMsgId: 'tw-r', status: 'delivered', createdAt: new Date(m.h.clock.now().getTime() + 2000) } });
    expect((await get(`/conversations/${c2.id}/messages/around/${old.id}`)).status).toBe(404);
    expect(threadSearchPageSchema.parse((await get(`/conversations/${c2.id}/messages/search-page?q=chao shop`)).body).total).toBe(0);
    const page = await get(`/conversations/${c2.id}/messages`);
    const r = page.body.data.find((x: Body) => x.id === reply);
    expect(r.reply_to).toEqual({ id: old.id, preview: '' });
  });
});

describe('EXPLAIN (ghi lại — .data/gate/025b-p2-explain.txt)', () => {
  it('cửa sổ quanh tin dùng index (conversation_id, created_at, id); tìm dùng trigram / index hội thoại', async () => {
    const dbName = (await m.h.platform.workspace.findUniqueOrThrow({ where: { id: m.h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('ANALYZE message');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      const around = await q(`SELECT * FROM message WHERE conversation_id = '${conv}' AND (created_at < now() OR (created_at = now() AND id < '${oldHit}')) ORDER BY created_at DESC, id DESC LIMIT 26`);
      const search = await q(`SELECT m.id FROM message m WHERE m.conversation_id = '${conv}' AND m.deleted_at IS NULL AND m.recalled_at IS NULL AND m.kind <> 'note' AND f_unaccent(lower(m.body)) LIKE '%triet long%' AND m.created_at <= now() ORDER BY m.created_at ASC, m.id ASC LIMIT 51`);
      if (process.env.EXPLAIN_OUT) writeFileSync(process.env.EXPLAIN_OUT, `--- around\n${around}\n--- search-page\n${search}\n`);
      expect(around).toMatch(/message_conversation_id_created_at_id_idx/);
      expect(search).toMatch(/message_body_trgm_idx|message_conversation_id_created_at_id_idx/);
    } finally {
      await c.end();
    }
  });
});
