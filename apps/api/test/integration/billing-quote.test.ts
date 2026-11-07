// TIP-039 pha 3 (AC03 / AC09) trên Postgres thật — `GET /v1/billing/quote` + summary khi hết hạn:
//   - quote = đúng số tiền / cách tính mà billing.create_invoice sẽ ghi (mua mới / gia hạn nối tiếp / nâng giữa kỳ chênh × kỳ còn lại +
//     Credit chênh, giữ ngày hết hạn / đổi xuống từ kỳ sau); không ghi gì (không hoá đơn, không mã); hoá đơn chờ cùng gói → `open`.
//   - tham số lạ → 400; không mua được (Miễn phí) → 422; Sales (không billing.manage) → 403.
//   - hết kỳ không gia hạn → summary `status: expired` + `retain_until` (+30 ngày); gia hạn sau đó là mua mới (kỳ từ lúc trả).
import 'reflect-metadata';
import { afterAll, describe, expect, it } from 'vitest';
import { ActionExecutor, InvoiceFulfiller, runLifecycle, uuidv7 } from '@appchat/core';
import { billQuoteSchema, wallToUtc } from '@appchat/shared';
import { call, startApi, type Harness } from './setup';

const VN = 'Asia/Ho_Chi_Minh';
const at = (d: string, hm = '10:00') => wallToUtc(d, hm, VN);
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const opened: Harness[] = [];

async function ws(start: string) {
  const h = await startApi();
  opened.push(h);
  h.clock.set(at(start));
  const trial = await h.platform.plan.findUniqueOrThrow({ where: { key: 'personal_pro' } });
  await h.platform.subscription.create({
    data: { id: uuidv7(), workspaceId: h.ws, planId: trial.id, status: 'trialing', currentPeriodStart: h.clock.now(), trialEndsAt: new Date(h.clock.now().getTime() + 86_400_000) },
  });
  const quote = async (item: string, extra = '') => json(await call(h, `/billing/quote?kind=plan&item=${item}${extra}`));
  const buy = async (item: string) => {
    const r = await json(await call(h, '/actions/billing.create_invoice', { input: { kind: 'plan', item, period: 'month' } }, { 'idempotency-key': uuidv7() }));
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return r.body.data.result.invoice_id as string;
  };
  const f = h.app.get(InvoiceFulfiller, { strict: false });
  const pay = async (id: string) => {
    expect(await f.markPaid(h.platform, id, { method: 'bank_transfer', confirmedBy: h.user })).toBe(true);
    return f.fulfil(id);
  };
  const invoices = () => h.platform.billingInvoice.count({ where: { workspaceId: h.ws } });
  return { h, quote, buy, pay, invoices };
}
const plan = (h: Harness, key: string) => h.platform.plan.findUniqueOrThrow({ where: { key } });

afterAll(async () => {
  for (const h of opened) await h.platform.billingInvoice.deleteMany({ where: { workspaceId: h.ws } });
  for (const h of opened) await h.close();
});

describe('GET /billing/quote', () => {
  it('mua mới → gia hạn → nâng giữa kỳ → đổi xuống: số tiền khớp hoá đơn tạo sau đó; quote không ghi gì', async () => {
    const w = await ws('2027-04-01');
    const [team, biz] = [await plan(w.h, 'team'), await plan(w.h, 'business')];
    const first = await w.quote('team');
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(billQuoteSchema.safeParse(first.body.data).success).toBe(true);
    expect(first.body.data).toMatchObject({ mode: 'new', amount: String(team.priceMonth), months: 1, open: null });
    expect(await w.invoices()).toBe(0);
    // Hoá đơn chờ cùng gói → quote báo dùng lại; trả xong → gói active.
    const inv = await w.buy('team');
    expect((await w.quote('team')).body.data.open).toMatchObject({ id: inv });
    await w.pay(inv);
    expect((await w.quote('team')).body.data).toMatchObject({ mode: 'renew', starts_at: at('2027-05-01').toISOString() });
    w.h.clock.set(at('2027-04-16'));
    const up = (await w.quote('business')).body.data;
    expect(up).toMatchObject({
      mode: 'upgrade',
      amount: String((biz.priceMonth! - team.priceMonth!) / 2n),
      credits: Number(biz.creditsMonth! - team.creditsMonth!) / 2,
      from_plan_key: 'team',
      ends_at: at('2027-05-01').toISOString(),
    });
    const upInv = await w.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: await w.buy('business') } });
    expect(String(upInv.amount)).toBe(up.amount);
    // Đã lên Business → Team rẻ hơn = đổi xuống từ kỳ sau, giá catalog của Team.
    await w.pay(upInv.id);
    expect((await w.quote('team')).body.data).toMatchObject({
      mode: 'switch',
      amount: String(team.priceMonth),
      starts_at: at('2027-05-01').toISOString(),
    });
  });

  it('tham số lạ → 400; gói Miễn phí → 422; Sales → 403', async () => {
    const w = await ws('2027-04-01');
    for (const qs of ['kind=bogus&item=team', 'kind=plan&item=DROP%20TABLE', 'kind=plan&item=team&period=week']) {
      expect((await json(await call(w.h, `/billing/quote?${qs}`))).status, qs).toBe(400);
    }
    expect((await w.quote('free')).status).toBe(422);
    const sales = await w.h.member('sales');
    expect((await call(w.h, '/billing/quote?kind=plan&item=team', undefined, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
  });
});

describe('hết hạn (AC09)', () => {
  it('hết kỳ không gia hạn → summary expired + retain_until +30 ngày; gia hạn sau đó là mua mới', async () => {
    const w = await ws('2027-04-01');
    await w.pay(await w.buy('team'));
    w.h.clock.set(at('2027-05-01', '10:01'));
    await runLifecycle({ platform: w.h.platform, executor: w.h.app.get(ActionExecutor, { strict: false }), now: () => w.h.clock.now() });
    const s = (await json(await call(w.h, '/billing/summary'))).body.data;
    expect(s).toMatchObject({ status: 'expired', retain_until: '2027-05-31' });
    expect((await w.quote('team')).body.data).toMatchObject({ mode: 'new', starts_at: null });
  });
});
