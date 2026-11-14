// TIP-034c §4.7 / AC8 — EXPLAIN trên 100k biên nhận: kết quả theo việc đọc `data_job_item` qua index (job_id, status, target_id) INCLUDE
// (outcome_code, changed, after_version, undo_state) hoặc khoá (job_id, target_id, generation) — không quét bảng; thao tác đi theo log cha qua
// `data_job_action_log_key`; danh sách việc của mình qua `data_job_actor_status_page_idx`. Truy vấn ticket kèm phạm vi support là MỘT câu
// theo tập id (≤ 200), không một câu mỗi tiêu đề / người phụ trách.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let c: pg.Client;

beforeAll(async () => {
  h = await startApi();
  const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
  c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
  await c.connect();
}, 120_000);
afterAll(async () => {
  await c?.end();
  await h?.close();
});

const plan = async (sql: string, args: unknown[]) => (await c.query(`EXPLAIN ${sql}`, args)).rows.map((x) => x['QUERY PLAN']).join('\n');

describe('EXPLAIN ticket bulk (AC8)', () => {
  it('100k biên nhận / 500 việc: kết quả, tập đã đổi, log cha, việc của mình — đều Index, không Seq Scan', async () => {
    // 500 việc × 200 biên nhận = 100k dòng (đúng trần 200 id / thao tác).
    await c.query(`INSERT INTO data_job (id, kind, action_id, actor_id, action_log_id, status, input, input_hash, total, created_at, updated_at)
      SELECT gen_random_uuid(), 'ticket.bulk_update', 'ticket.bulk_update', $1::uuid, gen_random_uuid(), 'completed', '{"ids":[],"duplicates":0}'::jsonb, 'x', 200, now() - (g||' minutes')::interval, now()
      FROM generate_series(1, 500) g`, [h.user]);
    await c.query(`INSERT INTO data_job_item (job_id, seq, target_id, status, generation, outcome_code, changed, after_version, undo_state, updated_at)
      SELECT j.id, s, gen_random_uuid(), (CASE WHEN s % 10 = 0 THEN 'failed' ELSE 'done' END), 0, (CASE WHEN s % 10 = 0 THEN 'NOT_FOUND' END), s % 3 <> 0, 2, 'eligible', now()
      FROM data_job j CROSS JOIN generate_series(0, 199) s WHERE j.kind = 'ticket.bulk_update' AND j.input_hash = 'x'`);
    await c.query('ANALYZE data_job');
    await c.query('ANALYZE data_job_item');
    const one = (await c.query(`SELECT id, action_log_id FROM data_job WHERE input_hash = 'x' LIMIT 1`)).rows[0] as { id: string; action_log_id: string };
    try {
      expect(Number((await c.query(`SELECT count(*) FROM data_job_item di JOIN data_job j ON j.id = di.job_id WHERE j.input_hash = 'x'`)).rows[0].count)).toBe(100_000);
      // Kết quả từng id của MỘT việc (bulkResultOf / ticket.bulk_export).
      const items = await plan(`SELECT target_id, status, outcome_code, error, changed FROM data_job_item WHERE job_id = $1::uuid ORDER BY seq`, [one.id]);
      expect(items).toMatch(/Index/);
      expect(items).not.toMatch(/Seq Scan on data_job_item/);
      // Tập "đã đổi" của hoàn tác / undo_state của tệp kết quả: covering index (job_id, status, target_id) INCLUDE (...).
      const changed = await plan(`SELECT target_id, after_version, undo_state FROM data_job_item WHERE job_id = $1::uuid AND status = 'done' AND changed = true AND generation = 0`, [one.id]);
      expect(changed).toMatch(/data_job_item_result_idx|data_job_item_target_generation_key|data_job_item_pkey/);
      expect(changed).not.toMatch(/Seq Scan on data_job_item/);
      // Thao tác đi theo log cha (hoàn tác / xuất kết quả).
      const byLog = await plan(`SELECT id, status, actor_id FROM data_job WHERE action_log_id = $1::uuid AND kind = 'ticket.bulk_update'`, [one.action_log_id]);
      expect(byLog).toMatch(/data_job_action_log_key/);
      // Việc của mình (actor, trạng thái, mới nhất trước).
      const mine = await plan(`SELECT id FROM data_job WHERE actor_id = $1::uuid AND status = 'completed' ORDER BY created_at DESC, id DESC LIMIT 20`, [h.user]);
      expect(mine).toMatch(/data_job_actor_status_page_idx/);
      // Phạm vi support: MỘT câu `id = ANY(≤ 200)` theo khoá chính (projectBulkRows / classify) — không một câu mỗi ticket; bảng ticket test
      // gần rỗng nên planner được quyền quét, chỉ kiểm câu hợp lệ + dùng được pkey khi có dữ liệu.
      const ids = (await c.query(`SELECT target_id FROM data_job_item WHERE job_id = $1::uuid`, [one.id])).rows.map((r) => r.target_id as string);
      await c.query('SET enable_seqscan = off');
      expect(await plan(`SELECT id, assignee_user_id, team_id, created_by_type, created_by_id, contact_id FROM ticket WHERE id = ANY($1::uuid[])`, [ids])).toMatch(/ticket_pkey/);
      await c.query('RESET enable_seqscan');
      // Route kết quả vẫn đúng hợp đồng (404 cho việc không phải của người gọi theo kiểu job).
      expect((await call(h, `/data-jobs/${one.id}/result`)).status).toBe(200);
    } finally {
      await c.query(`DELETE FROM data_job_item WHERE job_id IN (SELECT id FROM data_job WHERE input_hash = 'x')`);
      await c.query(`DELETE FROM data_job WHERE input_hash = 'x'`);
    }
  }, 240_000);
});
