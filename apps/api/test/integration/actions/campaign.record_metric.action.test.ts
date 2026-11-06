// Ma trận campaign.record_metric (TIP-037, system-only — consumer event tin vào / đơn hoàn tất): HTTP 403 / header system 422, ẩn khỏi Trợ
// lý. Nguồn system: tin khách sau gửi → replied (chạy lại không đếm đôi); event lạ → 404. Chuyển đổi + doanh thu + cửa sổ 7 ngày:
// marketing-contract.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { expectSystemOnly, mkMatrix, sentCampaign, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;

beforeAll(async () => {
  x = await mkMatrix('campaign.record_metric');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.record_metric', () => {
  it('system-only: HTTP 403 / header system 422; ẩn khỏi Trợ lý', async () => {
    await expectSystemOnly(x.m, { event_id: uuidv7(), kind: 'reply' });
  });

  it('nguồn system: tin khách → replied; chạy lại cùng event không đếm đôi; event không có → 404', async () => {
    const id = await sentCampaign(x);
    const r = (await x.mk.recipients(id))[0]!;
    const db = await x.m.db();
    x.m.h.clock.advance(3_600_000);
    const conv = (await db.conversation.findFirstOrThrow({ where: { contactId: r.contactId } })).id;
    const msg = uuidv7();
    await db.message.create({ data: { id: msg, conversationId: conv, channelAccountId: x.zalo, senderType: 'contact', direction: 'in', body: 'Còn ưu đãi?', createdAt: x.m.h.clock.now() } });
    const ev = uuidv7();
    await db.outboxEvent.create({ data: { id: ev, topic: 'message.received', payload: { contact_id: r.contactId, message_id: msg, is_group: false }, status: 'published', createdAt: x.m.h.clock.now() } });
    await x.mk.system('metric', 'campaign.record_metric', { event_id: ev, kind: 'reply' }, `${ev}:m1`);
    await x.mk.system('metric', 'campaign.record_metric', { event_id: ev, kind: 'reply' }, `${ev}:m2`);
    expect((await x.mk.get(`/campaigns/${id}`)).body.data.stats).toMatchObject({ sent: 1, replied: 1 });
    await expect(x.mk.system('metric', 'campaign.record_metric', { event_id: uuidv7(), kind: 'reply' })).rejects.toMatchObject({ httpStatus: 404 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
