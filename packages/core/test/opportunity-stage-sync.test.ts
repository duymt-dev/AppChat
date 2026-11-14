// TIP-026c AC6 (phần thuần + luật áp): giai đoạn khách suy từ cơ hội — đích = max(M, F); cả hai rỗng → consulting chỉ khi được hạ; tạo /
// nâng chỉ NÂNG; lùi / Thua được hạ; khách đã mua không bị hạ; giữ tay 24 giờ thắng (nằm trong applyStageRule — không đường UPDATE thứ hai).
import { describe, expect, it } from 'vitest';
import { recomputeContactStage, stageTarget } from '../src/crm/opportunities/stage-sync';
import { nextStepOf } from '../src/crm/opportunities/next-step';
import { bindStageFamily } from '../src/crm/stage/types';

describe('stageTarget — max(M, F)', () => {
  it('lấy hạng cao hơn của cơ hội mở và sàn chứng từ không gắn cơ hội', () => {
    expect(stageTarget('potential', null, false)).toEqual({ to: 'potential', lowerOnly: false });
    expect(stageTarget('lead', 'quote', true)).toEqual({ to: 'quote', lowerOnly: false });
    expect(stageTarget('contract', 'quote', true)).toEqual({ to: 'contract', lowerOnly: false });
    expect(stageTarget(null, 'contract', false)).toEqual({ to: 'contract', lowerOnly: false });
  });
  it('cả hai rỗng: được hạ → consulting (chỉ để lùi); không được hạ → không đổi', () => {
    expect(stageTarget(null, null, true)).toEqual({ to: 'consulting', lowerOnly: true });
    expect(stageTarget(null, null, false)).toBeNull();
  });
});

/** tx giả: hai truy vấn đọc M / F rồi tới applyStageRule (SELECT + UPDATE khách). */
function fakeTx(o: { open: string[]; contract?: boolean; quote?: boolean; contact: { stage: string; held?: boolean } }) {
  const writes: { stage: string }[] = [];
  const timeline: unknown[] = [];
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...vals: unknown[]) => {
      const sql = strings.join('?');
      if (sql.includes('FROM contact_opportunity')) return o.open.map((stage) => ({ stage }));
      if (sql.includes('EXISTS')) return [{ contract: !!o.contract, quote: !!o.quote }];
      if (sql.startsWith('\n    SELECT stage::text')) return [{ stage: o.contact.stage, version: 3, held: !!o.contact.held }];
      if (sql.includes('UPDATE contact SET stage')) {
        writes.push({ stage: String(vals[0]) });
        o.contact.stage = String(vals[0]);
        return [{ version: 4 }];
      }
      throw new Error(`sql lạ: ${sql.slice(0, 60)}`);
    },
    timelineEvent: { create: async (x: unknown) => timeline.push(x) },
  };
  bindStageFamily(tx, { rootId: 'c1', ids: ['c1'] });
  return { tx: tx as never, writes, timeline };
}
const run = (t: ReturnType<typeof fakeTx>, allowLower: boolean) => recomputeContactStage(t.tx, 'c1', { allowLower, actor: { type: 'user', id: 'u1' }, now: new Date('2026-11-14T03:00:00Z') });

describe('recomputeContactStage — áp qua applyStageRule', () => {
  it('tạo cơ hội Đủ điều kiện: khách lead → Đủ điều kiện (potential); event contact.stage_changed', async () => {
    const t = fakeTx({ open: ['qualified'], contact: { stage: 'lead' } });
    const ev = await run(t, false);
    expect(t.writes).toEqual([{ stage: 'potential' }]);
    expect(ev[0]).toMatchObject({ topic: 'contact.stage_changed', payload: { from: 'lead', to: 'potential', manual: false } });
  });

  it('AC6: Lead mới + Đàm phán (đang ở contract) → Đàm phán Thua, báo giá mở không gắn cơ hội → khách = Báo giá (sàn), không thấp hơn', async () => {
    const t = fakeTx({ open: ['lead'], quote: true, contact: { stage: 'contract' } });
    await run(t, true);
    expect(t.writes).toEqual([{ stage: 'quote' }]);
  });

  it('tạo / nâng không bao giờ hạ khách (allowLower=false)', async () => {
    const t = fakeTx({ open: ['lead'], contact: { stage: 'quote' } });
    expect(await run(t, false)).toEqual([]);
    expect(t.writes).toEqual([]);
  });

  it('D60: khách lead có cơ hội Thua → đích mặc định consulting nhưng chỉ dùng để lùi — khách giữ lead', async () => {
    const t = fakeTx({ open: [], contact: { stage: 'lead' } });
    expect(await run(t, true)).toEqual([]);
    expect(t.writes).toEqual([]);
  });

  it('hết cơ hội mở + hết chứng từ, khách ở contract → lùi consulting (luật lùi cũ)', async () => {
    const t = fakeTx({ open: [], contact: { stage: 'contract' } });
    await run(t, true);
    expect(t.writes).toEqual([{ stage: 'consulting' }]);
  });

  it('khách Đã mua không bị hạ; kéo tay trong 24 giờ thắng', async () => {
    const won = fakeTx({ open: ['lead'], contact: { stage: 'won' } });
    expect(await run(won, true)).toEqual([]);
    const held = fakeTx({ open: ['negotiation'], contact: { stage: 'lead', held: true } });
    expect(await run(held, false)).toEqual([]);
    expect(won.writes.length + held.writes.length).toBe(0);
  });

  it('cơ hội Đã mua không nâng khách lên Đã mua (M chỉ tính cơ hội mở)', async () => {
    const t = fakeTx({ open: [], contact: { stage: 'contract' } });
    await run(t, false);
    expect(t.writes).toEqual([]);
  });
});

describe('bước tiếp theo theo luật (source: rule)', () => {
  it('mỗi giai đoạn một khoá; Tư vấn ưu tiên lịch hẹn sắp tới; đã đóng → null', () => {
    expect(nextStepOf({ stage: 'lead', quoteCode: null, appointmentCode: null })).toEqual({ key: 'confirm_need', params: {}, source: 'rule' });
    expect(nextStepOf({ stage: 'qualified', quoteCode: null, appointmentCode: null })!.key).toBe('book_demo');
    expect(nextStepOf({ stage: 'demo', quoteCode: null, appointmentCode: 'LH-0001' })).toMatchObject({ key: 'attend_appointment', params: { code: 'LH-0001' } });
    expect(nextStepOf({ stage: 'demo', quoteCode: null, appointmentCode: null })!.key).toBe('send_quote');
    expect(nextStepOf({ stage: 'quote', quoteCode: 'BG-1001', appointmentCode: null })).toMatchObject({ key: 'follow_quote', params: { code: 'BG-1001' } });
    expect(nextStepOf({ stage: 'negotiation', quoteCode: 'BG-1001', appointmentCode: null })!.key).toBe('create_contract_or_order');
    expect(nextStepOf({ stage: 'won', quoteCode: null, appointmentCode: null })).toBeNull();
    expect(nextStepOf({ stage: 'lost', quoteCode: null, appointmentCode: null })).toBeNull();
  });
});
