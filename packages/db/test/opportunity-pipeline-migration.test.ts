// TIP-026c AC1: migration `20261114100000_opportunity_pipeline` chạy trên DB có dữ liệu TIP-026b — giữ id / version / timeline, ánh xạ
// giai đoạn open → lead · qualified → qualified · proposal → quote · won / lost giữ, chép `quote_id` sang `quote.opportunity_id` (+ chuỗi
// phiên bản + đơn kế thừa), bỏ cột cũ, dựng bảng con + index. Postgres thật (testing.md §2): DB tạm dựng từ template nền (chỉ extension),
// áp migration tới trước 026c, chèn bản chụp 026b, áp migration mới, đọc lại. Bỏ qua khi máy không có quyền admin Postgres.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TENANT_BOOTSTRAP_SQL, TENANT_MIGRATIONS_DIR, applyMigrations, readMigrations } from '../src/migrations';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const env = Object.fromEntries(
  ['.env', '.env.local-admin']
    .map((f) => join(ROOT, f))
    .filter(existsSync)
    .flatMap((f) => readFileSync(f, 'utf8').split(/\r?\n/))
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
) as Record<string, string>;
const ADMIN = process.env.PG_ADMIN_URL ?? env.PG_ADMIN_URL;
const BASE = env.TENANT_BASE_DB ?? 'appchat_tenant_base';
const TARGET = '20261114100000_opportunity_pipeline';
const DB = `t026c_${randomUUID().slice(-12)}`;
const urlOf = (db: string) => {
  const u = new URL(ADMIN!);
  u.pathname = `/${db}`;
  return u.toString();
};

const ids = { c1: randomUUID(), c2: randomUUID(), owner: randomUUID(), team: randomUUID(), q1: randomUUID(), q1v2: randomUUID(), q2: randomUUID(), k1: randomUUID(), o1: randomUUID(), o2: randomUUID() };
const opp = { open: randomUUID(), qualified: randomUUID(), proposal: randomUUID(), won: randomUUID(), lost: randomUUID(), archivedDup: randomUUID() };
let client: pg.Client;

async function admin(sql: string, url = ADMIN) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

describe.skipIf(!ADMIN)('migration 20261114100000_opportunity_pipeline (dữ liệu 026b)', () => {
  beforeAll(async () => {
    await admin(`CREATE DATABASE "${DB}" TEMPLATE "${BASE}"`);
    // Như setupCluster: bootstrap (extension + f_unaccent) bằng admin trước migration.
    await admin(readFileSync(TENANT_BOOTSTRAP_SQL, 'utf8'), urlOf(DB));
    const all = readMigrations(TENANT_MIGRATIONS_DIR);
    await applyMigrations(urlOf(DB), all.filter((m) => m.name < TARGET));
    client = new pg.Client({ connectionString: urlOf(DB) });
    await client.connect();
    const q = (sql: string, p: unknown[] = []) => client.query(sql, p);
    await q(`INSERT INTO contact (id, code, name, owner_user_id) VALUES ($1, 'KH-9001', 'Lan', $3), ($2, 'KH-9002', 'Minh', NULL)`, [ids.c1, ids.c2, ids.owner]);
    await q(`INSERT INTO team (id, name) VALUES ($1, 'Sales HN')`, [ids.team]);
    await q(`INSERT INTO team_member (team_id, user_id) VALUES ($1, $2)`, [ids.team, ids.owner]);
    // Báo giá v1 → v2 cùng chuỗi; báo giá thứ hai; hợp đồng từ báo giá thứ hai; đơn từ báo giá v1 và từ hợp đồng.
    await q(`INSERT INTO quote (id, code, version, root_quote_id, contact_id, status) VALUES ($1, 'BG-9001', 1, $1, $3, 'superseded'), ($2, 'BG-9001', 2, $1, $3, 'accepted'), ($4, 'BG-9002', 1, $4, $3, 'accepted')`, [ids.q1, ids.q1v2, ids.c1, ids.q2]);
    await q(`INSERT INTO contract (id, code, contact_id, quote_id) VALUES ($1, 'HĐ-9001', $2, $3)`, [ids.k1, ids.c1, ids.q2]);
    await q(`INSERT INTO "order" (id, code, contact_id, quote_id) VALUES ($1, 'DH-009001', $2, $3)`, [ids.o1, ids.c1, ids.q1]);
    await q(`INSERT INTO "order" (id, code, contact_id, contract_id) VALUES ($1, 'DH-009002', $2, $3)`, [ids.o2, ids.c1, ids.k1]);
    const ins = `INSERT INTO contact_opportunity (id, contact_id, title, amount_vnd, stage, probability, quote_id, source_conversation_id, version, created_by, actor_type, archived_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5::contact_opportunity_stage, $6, $7, $8, $9, $10, $11, $12, $13)`;
    const t = (s: string) => new Date(`2026-11-0${s}T03:00:00Z`);
    await q(ins, [opp.open, ids.c1, 'HIFU', '48000000', 'open', 30, null, null, 3, ids.owner, 'user', null, t('1')]);
    await q(ins, [opp.qualified, ids.c1, 'Combo da', null, 'qualified', null, null, randomUUID(), 1, null, 'agent', null, t('2')]);
    await q(ins, [opp.proposal, ids.c1, 'Gói 10 buổi', '15000000', 'proposal', 60, ids.q1v2, null, 2, ids.owner, 'user', null, t('3')]);
    await q(ins, [opp.won, ids.c1, 'Gói VIP', '90000000', 'won', 100, ids.q2, null, 4, ids.owner, 'user', null, t('4')]);
    await q(ins, [opp.lost, ids.c2, 'Tư vấn', '5000000', 'lost', 0, null, null, 2, null, 'agent', null, t('5')]);
    // Hai cơ hội cùng một báo giá: bản đã lưu trữ thua bản còn sống.
    await q(ins, [opp.archivedDup, ids.c1, 'Trùng', null, 'proposal', 50, ids.q2, null, 1, ids.owner, 'user', t('6'), t('6')]);
    await q(`INSERT INTO timeline_event (id, contact_id, type, ref_type, ref_id, actor_type, summary) VALUES ($1, $2, 'contact_opportunity', 'contact_opportunity', $3, 'user', '')`, [randomUUID(), ids.c1, opp.open]);
    await applyMigrations(urlOf(DB), all.filter((m) => m.name === TARGET));
  });

  afterAll(async () => {
    await client?.end();
    if (ADMIN) await admin(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
  });

  it('giữ id / version, ánh xạ giai đoạn đúng, phụ trách / nhóm / nguồn / mốc đóng', async () => {
    const r = await client.query(`SELECT id, stage::text AS stage, version, owner_user_id, team_id, source_kind, closed_at, lost_reason FROM contact_opportunity`);
    const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
    expect(r.rowCount).toBe(6);
    expect([opp.open, opp.qualified, opp.proposal, opp.won, opp.lost].map((id) => by[id].stage)).toEqual(['lead', 'qualified', 'quote', 'won', 'lost']);
    expect(by[opp.open].version).toBe(3);
    expect(by[opp.open].owner_user_id).toBe(ids.owner);
    expect(by[opp.open].team_id).toBe(ids.team);
    // Agent tạo → phụ trách khách (khách 1 có owner).
    expect(by[opp.qualified].owner_user_id).toBe(ids.owner);
    expect(by[opp.qualified].source_kind).toBe('conversation');
    expect(by[opp.lost].owner_user_id).toBeNull();
    expect(by[opp.won].closed_at).not.toBeNull();
    expect(by[opp.open].closed_at).toBeNull();
    // Thua cũ không có lý do — không bịa.
    expect(by[opp.lost].lost_reason).toBeNull();
  });

  it('chép quote_id sang quote.opportunity_id (+ chuỗi phiên bản, cơ hội sống thắng bản lưu trữ) và đơn kế thừa', async () => {
    const q = Object.fromEntries((await client.query(`SELECT id, opportunity_id FROM quote`)).rows.map((x) => [x.id, x.opportunity_id]));
    expect(q[ids.q1v2]).toBe(opp.proposal);
    expect(q[ids.q1]).toBe(opp.proposal);
    expect(q[ids.q2]).toBe(opp.won);
    const o = Object.fromEntries((await client.query(`SELECT id, opportunity_id FROM "order"`)).rows.map((x) => [x.id, x.opportunity_id]));
    expect(o[ids.o1]).toBe(opp.proposal);
    expect(o[ids.o2]).toBe(opp.won);
  });

  it('bỏ cột probability / quote_id, timeline giữ ref, bảng con + index có mặt', async () => {
    const cols = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'contact_opportunity'`)).rows.map((x) => x.column_name);
    expect(cols).not.toContain('probability');
    expect(cols).not.toContain('quote_id');
    expect((await client.query(`SELECT count(*)::int AS n FROM timeline_event WHERE ref_id = $1`, [opp.open])).rows[0].n).toBe(1);
    const idx = (await client.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`)).rows.map((x) => x.indexname);
    for (const i of ['contact_opportunity_contact_idx', 'contact_opportunity_open_idx', 'contact_opportunity_owner_close_idx', 'contact_opportunity_event_opp_idx', 'quote_opportunity_idx', 'order_opportunity_idx', 'appointment_opportunity_idx']) expect(idx).toContain(i);
    expect(idx).not.toContain('contact_opportunity_live_idx');
    await expect(client.query(`UPDATE contact_opportunity SET lost_reason = 'price' WHERE id = $1`, [opp.open])).rejects.toThrow(/lost_reason_chk/);
    await client.query(`UPDATE contact_opportunity SET lost_reason = 'price' WHERE id = $1`, [opp.lost]);
  });
});
