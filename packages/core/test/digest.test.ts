// TIP-038 pha 4 (unit, DC-366): kỳ email tóm tắt theo lịch workspace (hằng ngày / Thứ Hai, DST), lùi qua DND, hết hạn không gửi bù,
// nội dung escape HTML + vi / en, ghi kết quả gửi bằng CAS (4xx → failed, lỗi không chắc → unknown, không gửi lại).
import { describe, expect, it } from 'vitest';
import { MailSendError, type MailMessage, type MailProvider } from '@appchat/integrations';
import type { WorkItemDto } from '@appchat/shared';
import {
  afterQuietHours,
  deliverDigests,
  DIGEST_GRACE_MS,
  DIGEST_WORK_LINES,
  digestExpired,
  digestMail,
  lastClosedPeriod,
} from '../src';

const VN = 'Asia/Ho_Chi_Minh';
const at = (iso: string) => new Date(iso);

describe('lastClosedPeriod', () => {
  it('hằng ngày: sau 08:00 → hôm qua; trước 08:00 → hôm kia', () => {
    const p = lastClosedPeriod('daily', at('2026-11-06T02:00:00Z'), VN); // 09:00 VN thứ Sáu
    expect(p.label).toBe('2026-11-05');
    expect(p.start.toISOString()).toBe('2026-11-04T17:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-05T17:00:00.000Z');
    expect(p.sendAt.toISOString()).toBe('2026-11-06T01:00:00.000Z');
    const early = lastClosedPeriod('daily', at('2026-11-06T00:30:00Z'), VN); // 07:30 VN
    expect(early.label).toBe('2026-11-04');
    expect(early.sendAt.toISOString()).toBe('2026-11-05T01:00:00.000Z');
  });

  it('hằng tuần: tuần trước Thứ Hai → Thứ Hai, gửi Thứ Hai 08:00', () => {
    const p = lastClosedPeriod('weekly', at('2026-11-06T02:00:00Z'), VN); // thứ Sáu
    expect(p.label).toBe('2026-10-26');
    expect(p.start.toISOString()).toBe('2026-10-25T17:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-11-01T17:00:00.000Z');
    expect(p.sendAt.toISOString()).toBe('2026-11-02T01:00:00.000Z');
    // Thứ Hai 07:59 VN → tuần trước nữa; 08:00 → tuần vừa đóng.
    expect(lastClosedPeriod('weekly', at('2026-11-02T00:59:00Z'), VN).label).toBe('2026-10-19');
    expect(lastClosedPeriod('weekly', at('2026-11-02T01:00:00Z'), VN).label).toBe('2026-10-26');
  });

  it('DST: ngày đổi giờ dài 25 giờ — ranh giới theo lịch, không cộng 86.400 giây', () => {
    const p = lastClosedPeriod('daily', at('2026-10-26T08:00:00Z'), 'Europe/Berlin');
    expect(p.label).toBe('2026-10-25');
    expect(p.start.toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect(p.end.getTime() - p.start.getTime()).toBe(25 * 3_600_000);
    expect(p.sendAt.toISOString()).toBe('2026-10-26T07:00:00.000Z');
  });
});

describe('afterQuietHours / hết hạn', () => {
  const send = at('2026-11-06T01:00:00Z'); // 08:00 VN
  it('ngoài DND / DND tắt → giữ mốc', () => {
    expect(afterQuietHours(send, { on: false, from: '22:00', to: '09:00' }, VN)).toEqual(send);
    expect(afterQuietHours(send, { on: true, from: '22:00', to: '07:00' }, VN)).toEqual(send);
  });
  it('DND qua đêm phủ 08:00 → lùi tới giờ kết thúc cùng ngày', () => {
    expect(afterQuietHours(send, { on: true, from: '22:00', to: '09:30' }, VN).toISOString()).toBe(
      '2026-11-06T02:30:00.000Z',
    );
  });
  it('DND trong ngày phủ 08:00 → lùi tới giờ kết thúc', () => {
    expect(afterQuietHours(send, { on: true, from: '07:00', to: '12:00' }, VN).toISOString()).toBe(
      '2026-11-06T05:00:00.000Z',
    );
  });
  it('quá hạn gửi → bỏ kỳ (không dồn backlog)', () => {
    expect(digestExpired({ sendAt: send }, new Date(send.getTime() + DIGEST_GRACE_MS))).toBe(false);
    expect(digestExpired({ sendAt: send }, new Date(send.getTime() + DIGEST_GRACE_MS + 1))).toBe(true);
  });
});

describe('digestMail', () => {
  const item = (i: number, title = `Việc ${i}`): WorkItemDto => ({
    id: `w${i}`,
    type: 'approval',
    title,
    sub: 'Hạn hôm nay',
    due_at: null,
    route: `/quotes?id=${i}`,
  });
  const base = {
    to: 'a@x.vn',
    workspace: 'Spa <An>',
    cadence: 'daily' as const,
    period: '05/11/2026',
    followUps: 3,
    ai: { runs: 4, actions: 2, handoffs: 1, credits: null },
    publicUrl: 'https://app.example.vn/',
  };

  it('escape mọi chuỗi động, link tuyệt đối, giới hạn số dòng việc', () => {
    const work = [item(1, '<script>alert(1)</script>'), ...Array.from({ length: 10 }, (_, i) => item(i + 2))];
    const m = digestMail({ ...base, locale: 'vi', work });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&#60;script&#62;');
    expect(m.subject).toBe('[Spa <An>] Tóm tắt ngày 05/11/2026');
    expect(m.html).toContain('Spa &#60;An&#62;');
    expect(m.html).toContain('href="https://app.example.vn/quotes?id=1"');
    expect((m.html.match(/<li>/g) ?? []).length).toBe(DIGEST_WORK_LINES);
    expect(m.text).toContain(`… và ${work.length - DIGEST_WORK_LINES} việc khác`);
    expect(m.text).toContain('Khách đến hạn liên hệ lại: 3');
    expect(m.tag).toBe('digest_daily');
  });

  it('en + hằng tuần + không có việc', () => {
    const m = digestMail({ ...base, locale: 'en', cadence: 'weekly', work: [] });
    expect(m.tag).toBe('digest_weekly');
    expect(m.text).not.toContain('Việc cần bạn');
    expect(m.text).toContain('https://app.example.vn/dashboard');
  });
});

/** Sổ giả: chỉ CAS theo (id, version). */
function fakeLedger() {
  const rows = new Map<
    string,
    { version: number; state: string; reason?: string | null; providerId?: string }
  >();
  const db = {
    digestDelivery: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; version: number };
        data: Record<string, unknown>;
      }) => {
        const r = rows.get(where.id);
        if (!r || r.version !== where.version) return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      },
    },
  };
  return { rows, db: db as never };
}

const provider = (send: (m: MailMessage) => Promise<{ id: string }>): MailProvider =>
  ({ key: 'test', send }) as MailProvider;
const job = (id: string) => ({
  id,
  version: 2,
  mail: { to: `${id}@x.vn`, subject: 's', html: 'h', text: 't' } as MailMessage,
});

describe('deliverDigests', () => {
  it('thành công → sent; 4xx → failed; 429 / 5xx / lỗi mạng → unknown; mỗi dòng gọi đúng một lần', async () => {
    const { rows, db } = fakeLedger();
    for (const id of ['ok', 'bad', 'rate', 'down', 'net']) rows.set(id, { version: 2, state: 'sending' });
    const calls: string[] = [];
    const mail = provider(async (m) => {
      calls.push(m.to);
      if (m.to.startsWith('bad')) throw new MailSendError('test', 400);
      if (m.to.startsWith('rate')) throw new MailSendError('test', 429);
      if (m.to.startsWith('down')) throw new MailSendError('test', 503);
      if (m.to.startsWith('net')) throw new Error('ECONNRESET');
      return { id: 'msg-1' };
    });
    const out = await deliverDigests(db, mail, ['ok', 'bad', 'rate', 'down', 'net'].map(job), () =>
      at('2026-11-06T01:00:00Z'),
    );
    expect(out).toEqual({ sent: 1, failed: 1, unknown: 3 });
    expect(calls).toHaveLength(5);
    expect(rows.get('ok')).toMatchObject({ state: 'sent', providerId: 'msg-1', version: 3 });
    expect(rows.get('bad')).toMatchObject({ state: 'failed', reason: 'provider_400' });
    expect(rows.get('net')).toMatchObject({ state: 'unknown', reason: 'provider_error' });
  });

  it('dòng đã bị đổi version (quét stale) → không ghè kết quả', async () => {
    const { rows, db } = fakeLedger();
    rows.set('x', { version: 3, state: 'unknown' });
    await deliverDigests(
      db,
      provider(async () => ({ id: 'm' })),
      [job('x')],
      () => new Date(),
    );
    expect(rows.get('x')).toMatchObject({ state: 'unknown', version: 3 });
  });
});
