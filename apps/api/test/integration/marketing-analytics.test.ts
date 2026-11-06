// TIP-037 — chỉ mục + AI Marketing (AC1 EXPLAIN, AC6): danh sách chiến dịch (lọc trạng thái / kênh, created_at desc) đi index `campaign_*_list_idx`,
// trang người nhận (campaign_id, status, id) đi `campaign_recipient_status_idx`, khoá 48 giờ theo khách (PK), gán last-touch theo khách
// (`campaign_recipient_contact_sent_idx`), quét tới hạn (`campaign_due_idx`); EXPLAIN dán ra log. AI: campaign.analyze chỉ ghi yêu cầu (run
// queued, không gọi model trong request) → processAnalyze với model giả qua AiRunner + CreditMeter thật: gợi ý cấu trúc đóng (bộ lọc lạ bị
// loại), trừ Credit một lần (chạy lại job không gọi model / không trừ thêm), trạng thái run theo người yêu cầu; ví 0 → failed, không gợi ý;
// người yêu cầu mất campaign.manage → không chạy; soạn nội dung theo giọng → chỉ trả đề xuất (không lưu / không gửi), biến lạ → 502.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { AiRunner, CreditMeter, DbPriceBook, MarketingDeps, WalletService, createLogger, processAnalyze, uuidv7 } from '@appchat/core';
import { campaignAnalysisSchema, campaignSuggestionSchema } from '@appchat/shared';
import { env, startApi, type Harness } from './setup';
import { Mk } from './helpers/marketing-fixtures';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
let h: Harness;
let mk: Mk;
let calls = 0;

const OK = {
  suggestions: [
    { kind: 'reactivation', title: 'Khách lâu chưa quay lại', reason: '40% khách VIP chưa mua 90 ngày', filter: { op: 'and', children: [{ field: 'group', op: 'in', value: ['vip'] }, { field: 'last_order_at', op: 'older_than_days', value: 90 }] }, channel: 'zalo', best_time: '09:00', subject: '', body: 'Chào {ten}, lâu rồi chưa gặp', cta: 'Đặt lịch' },
    { kind: 'upsell', title: 'Lọc lạ', reason: 'x', filter: { field: 'raw_sql', op: 'eq', value: '1=1' }, channel: 'zalo', best_time: null, subject: '', body: 'x', cta: '' },
  ],
};

function runner(script: MockScript) {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => (calls++, spy(o));
  return new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
}
const wallet = () => h.app.get(WalletService, { strict: false });
const analyzeDeps = (script: MockScript) => {
  const d = h.app.get(MarketingDeps, { strict: false });
  return { tenants: mk.resolver, runner: runner(script), executor: mk.executor(), authzOf: (ws: string, u: string) => d.authzOf(ws, u), now: () => h.clock.now() };
};

beforeAll(async () => {
  h = await startApi();
  mk = new Mk(h);
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
}, 240_000);
afterAll(async () => {
  await mk?.close();
  await h?.close();
});

describe('AC1 EXPLAIN', () => {
  it('danh sách / người nhận / khoá 48 giờ / gán / quét tới hạn đi đúng index (dán plan ra log)', async () => {
    const zalo = await mk.account('zalo_personal', 'Zalo idx');
    const ks = await Promise.all(Array.from({ length: 5 }, () => mk.contact({ zaloAccount: zalo })));
    await mk.campaign({ contacts: ks, account: zalo, approve: true });
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws }, select: { dbName: true } });
    const url = new URL(env.TENANT_DATABASE_URL!);
    url.pathname = `/${ws.dbName}`;
    const c = new pg.Client({ connectionString: url.toString() });
    await c.connect();
    try {
      await c.query('ANALYZE');
      await c.query('SET enable_seqscan = off');
      const id = uuidv7();
      const plan = async (q: string) => (await c.query(`EXPLAIN ${q}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      const plans: Record<string, string> = {
        list: await plan(`SELECT c.id FROM campaign c WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC, c.id DESC LIMIT 20 OFFSET 0`),
        list_status: await plan(`SELECT c.id FROM campaign c WHERE c.deleted_at IS NULL AND c.status = 'running' ORDER BY c.created_at DESC, c.id DESC LIMIT 20`),
        list_channel: await plan(`SELECT c.id FROM campaign c WHERE c.deleted_at IS NULL AND c.channel = 'zalo' ORDER BY c.created_at DESC, c.id DESC LIMIT 20`),
        recipients: await plan(`SELECT r.id FROM campaign_recipient r WHERE r.campaign_id = '${id}'::uuid AND r.status = 'pending' ORDER BY r.id LIMIT 50`),
        claim: await plan(`SELECT r.id FROM campaign_recipient r WHERE r.campaign_id = '${id}'::uuid AND r.status = 'pending' AND r.claimed_at IS NULL ORDER BY r.id LIMIT 50 FOR UPDATE OF r SKIP LOCKED`),
        cooldown: await plan(`SELECT 1 FROM campaign_contact_touch tt WHERE tt.contact_id = '${id}'::uuid AND tt.touched_at > now() - interval '48 hours'`),
        last_touch: await plan(`SELECT id FROM campaign_recipient WHERE contact_id = '${id}'::uuid AND outcome = 'accepted' AND sent_at IS NOT NULL AND sent_at <= now() AND sent_at >= now() - interval '7 days' ORDER BY sent_at DESC LIMIT 1`),
        due: await plan(`SELECT id FROM campaign WHERE deleted_at IS NULL AND status IN ('approved', 'scheduled', 'running') AND (status <> 'scheduled' OR scheduled_at <= now()) ORDER BY status, scheduled_at LIMIT 50`),
      };
      // Bằng chứng EXPLAIN cho completion report (MARKETING_EXPLAIN_OUT = đường tệp); vắng → không ghi.
      if (process.env.MARKETING_EXPLAIN_OUT) writeFileSync(process.env.MARKETING_EXPLAIN_OUT, Object.entries(plans).map(([k, v]) => `── EXPLAIN ${k}\n${v}`).join('\n'));
      expect(plans.list).toMatch(/campaign_list_idx/);
      expect(plans.list_status).toMatch(/campaign_status_list_idx/);
      expect(plans.list_channel).toMatch(/campaign_channel_list_idx/);
      expect(plans.recipients).toMatch(/campaign_recipient_status_idx/);
      expect(plans.claim).toMatch(/campaign_recipient_status_idx/);
      expect(plans.cooldown).toMatch(/campaign_contact_touch_pkey/);
      expect(plans.last_touch).toMatch(/campaign_recipient_contact_sent_idx/);
      expect(plans.due).toMatch(/campaign_due_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('AC6 phân tích AI', () => {
  it('analyze: request chỉ xếp hàng (0 lần gọi model); job → gợi ý hợp lệ (lọc lạ bị loại), Credit trừ một lần; chạy lại không gọi lại', async () => {
    await wallet().topup(h.ws, 100, { refType: 'test', refId: uuidv7() });
    const before = calls;
    const r = await mk.act('campaign.analyze', {});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const runId = r.body.data.result.run_id as string;
    expect(calls).toBe(before);
    expect(campaignAnalysisSchema.parse((await mk.get(`/campaign-analyses/${runId}`)).body.data)).toMatchObject({ status: 'queued' });
    // Bấm lại khi còn chờ → cùng run.
    expect((await mk.act('campaign.analyze', {})).body.data.result.run_id).toBe(runId);
    const deps = analyzeDeps(() => ({ text: '```json\n' + JSON.stringify(OK) + '\n```', tokensIn: 1000, tokensOut: 1000 }));
    expect(await processAnalyze(deps, { ws: h.ws, run_id: runId, user_id: h.user })).toBe('stored');
    expect(calls).toBe(before + 1);
    const bal = (await wallet().balance(h.ws)).total;
    expect(bal).toBe(96);
    expect(await processAnalyze(deps, { ws: h.ws, run_id: runId, user_id: h.user })).toBe('stored');
    expect(calls).toBe(before + 1);
    expect((await wallet().balance(h.ws)).total).toBe(bal);
    const st = (await mk.get(`/campaign-analyses/${runId}`)).body.data;
    expect(st).toEqual({ run_id: runId, status: 'completed', stored: 1, error: null });
    const list = (await mk.get('/campaign-suggestions')).body.data;
    expect(list.map((s: { kind: string }) => s.kind)).toEqual(['reactivation']);
    expect(campaignSuggestionSchema.safeParse(list[0]).success).toBe(true);
    // Lượt của người khác → 404.
    const other = await h.member('manager');
    expect((await mk.get(`/campaign-analyses/${runId}`, other)).status).toBe(404);
    // Gợi ý không tự tạo / gửi chiến dịch.
    expect(await (await mk.db()).campaign.count({ where: { suggestionId: { not: null } } })).toBe(0);
    // Người tạo chiến dịch TỪ gợi ý (không chọn thêm khách) → nháp, người nhận = bộ lọc của gợi ý; gợi ý chuyển "đã dùng".
    const used = await mk.act('campaign.create', { name: 'Từ gợi ý', channel: 'zalo', suggestion_id: list[0].id, content: { text: 'Chào {ten}' } });
    expect(used.status, JSON.stringify(used.body)).toBe(200);
    expect((await mk.get(`/campaigns/${used.body.data.result.campaign_id}`)).body.data).toMatchObject({ status: 'draft', source: 'ai' });
    expect((await (await mk.db()).campaignSuggestion.findUniqueOrThrow({ where: { id: list[0].id } })).status).toBe('used');
  });

  it('ví 0 → run failed, không gợi ý mới; người yêu cầu mất campaign.manage → không chạy model', async () => {
    await wallet().adjust(h.ws, -(await wallet().balance(h.ws)).total, { refType: 'test', refId: uuidv7() });
    expect((await wallet().balance(h.ws)).total).toBe(0);
    // Yêu cầu trước đã được relay (không còn chờ) → lượt mới có run riêng.
    await (await mk.db()).outboxEvent.updateMany({ where: { topic: 'campaign.analysis_requested' }, data: { status: 'published' } });
    const r = await mk.act('campaign.analyze', {});
    const runId = r.body.data.result.run_id as string;
    const before = calls;
    await expect(processAnalyze(analyzeDeps(() => ({ text: JSON.stringify(OK) })), { ws: h.ws, run_id: runId, user_id: h.user })).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
    expect(calls).toBe(before);
    expect((await mk.get(`/campaign-analyses/${runId}`)).body.data).toMatchObject({ status: 'failed' });
    const sales = await h.member('sales');
    expect(await processAnalyze(analyzeDeps(() => ({ text: JSON.stringify(OK) })), { ws: h.ws, run_id: uuidv7(), user_id: sales.id })).toBe('forbidden');
    expect(calls).toBe(before);
  });
});
