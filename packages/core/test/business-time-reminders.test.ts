// TIP-003g (§2.5 money-time-numbering): dời mốc nhắc ngoài giờ làm việc sang đầu giờ làm việc kế tiếp bằng `FixedClock`.
// Kiểm: toán học lịch tuần, sweepQuotes (T-2), sweepPayments (T-1 / T+1 / T+7 kể cả cuối tuần đẩy > 8 ngày), sweepBooking (24h dời vs 2h MIỄN).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FixedClock,
  registerSystemVerifier,
  sweepBooking,
  sweepPayments,
  sweepQuotes,
  systemCapabilityOf,
  systemVerifierRegistered,
  unregisterSystemVerifier,
} from '../src';
import {
  appointmentRemindScheduledAt,
  dueAppointmentReminder,
  dueInvoiceReminder,
  invoiceRemindScheduledAt,
  isBusinessMoment,
  isQuoteRemindDue,
  nextBusinessMoment,
  quoteRemindScheduledAt,
  reminderCalendarOf,
} from '../src/kernel/time/reminder-schedule';

const ACTIONS = ['quote.system_transition', 'invoice.system_transition', 'appointment.system_transition'] as const;
const registeredByTest: string[] = [];

beforeAll(() => {
  for (const id of ACTIONS) {
    if (!systemVerifierRegistered(id)) {
      registerSystemVerifier(id, async () => undefined);
      registeredByTest.push(id);
    }
  }
});

afterAll(() => {
  for (const id of registeredByTest) unregisterSystemVerifier(id);
});

/** Lịch Mon–Fri 08:00–18:00 (Thứ Bảy / Chủ nhật nghỉ) theo múi VN UTC+7 để kiểm rõ cả đêm lẫn cuối tuần. */
const MON_FRI_SETTINGS = {
  working_hours: {
    pause_sla: false,
    days: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, on: day < 5, from: '08:00', to: '18:00' })),
  },
};

function makeHarness(clock: FixedClock, settings: unknown = MON_FRI_SETTINGS) {
  const receipts = new Set<string>();
  const sent: { actionId: string; targetId: string; milestone: string; at: string }[] = [];
  const quotes: { id: string; validUntil: Date; remindedAt: Date | null }[] = [];
  const invoices: { id: string; dueDate: Date }[] = [];
  const appts: { id: string; startAt: Date; sent: { key: string }[] }[] = [];

  const db = {
    customerPackage: {
      findMany: async () => [],
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join(' ');
      if (sql.includes('FROM system_action_receipt')) {
        // values: [sourceKind, sourceRef, actionId, targetId, generation, milestone]
        const key = `${values[2]}:${values[3]}:${values[5]}`;
        return receipts.has(key) ? [{ phase: 'applied' }] : [];
      }
      if (sql.includes('FROM quote')) {
        if (sql.includes('reminded_at IS NULL')) {
          const now = values[0] as Date;
          const end = values[1] as Date;
          return quotes.filter((q) => !q.remindedAt && q.validUntil >= now && q.validUntil <= end).map((q) => ({ id: q.id, at: q.validUntil }));
        }
        return [];
      }
      if (sql.includes('FROM invoice')) {
        if (sql.includes('conversation_id IS NOT NULL')) {
          const from = values[0] as Date;
          const to = values[1] as Date;
          return invoices.filter((i) => i.dueDate >= from && i.dueDate <= to).map((i) => ({ id: i.id, at: i.dueDate }));
        }
        return [];
      }
      if (sql.includes('FROM appointment')) {
        if (sql.includes('reminders_sent AS sent')) {
          const now = values[0] as Date;
          const until = values[1] as Date;
          return appts.filter((a) => a.startAt > now && a.startAt <= until).map((a) => ({ id: a.id, at: a.startAt, sent: a.sent }));
        }
        return [];
      }
      if (sql.includes('FROM customer_package')) return [];
      return [];
    },
  };

  const deps = {
    platform: {
      workspace: {
        findMany: async () => [{ id: 'ws-1', timezone: 'Asia/Ho_Chi_Minh', settings }],
      },
    } as never,
    tenants: { get: async () => db } as never,
    executor: {
      execute: async (ctx: Parameters<typeof systemCapabilityOf>[0], actionId: string) => {
        const cap = systemCapabilityOf(ctx);
        if (!cap) throw new Error('missing capability');
        receipts.add(`${actionId}:${cap.targetId}:${cap.milestone}`);
        sent.push({ actionId, targetId: cap.targetId, milestone: cap.milestone, at: clock.now().toISOString() });
        if (actionId === 'quote.system_transition') {
          const q = quotes.find((x) => x.id === cap.targetId);
          if (q) q.remindedAt = clock.now();
        }
        if (actionId === 'appointment.system_transition') {
          const a = appts.find((x) => x.id === cap.targetId);
          if (a) a.sent.push({ key: cap.milestone });
        }
        return { data: { result: { disposition: 'applied', operation_id: cap.targetId } } };
      },
    } as never,
    now: () => clock.now(),
  };

  return { deps, quotes, invoices, appts, sent };
}

describe('business-time reminders (TIP-003g)', () => {
  it('dời mốc ngoài giờ về đầu giờ làm việc kế tiếp và đọc cả working_hours lẫn business_hours', () => {
    const cal1 = reminderCalendarOf({ timezone: 'Asia/Ho_Chi_Minh', settings: MON_FRI_SETTINGS });
    const cal2 = reminderCalendarOf({
      timezone: 'Asia/Ho_Chi_Minh',
      settings: { business_hours: { days: MON_FRI_SETTINGS.working_hours.days } },
    });
    expect(cal1.enabled).toBe(true);
    expect(cal2.days).toEqual(cal1.days);

    // 2026-11-10 = Thứ Ba 22:00 ICT (15:00Z) → 2026-11-11 = Thứ Tư 08:00 ICT (01:00Z).
    expect(isBusinessMoment(new Date('2026-11-10T15:00:00Z'), cal1)).toBe(false);
    expect(nextBusinessMoment(new Date('2026-11-10T15:00:00Z'), cal1).toISOString()).toBe('2026-11-11T01:00:00.000Z');
    expect(isBusinessMoment(new Date('2026-11-11T01:00:00Z'), cal1)).toBe(true);

    // Cuối tuần Chủ nhật 2026-11-15 09:30 ICT (02:30Z) → Thứ Hai 2026-11-16 08:00 ICT (01:00Z).
    expect(nextBusinessMoment(new Date('2026-11-15T02:30:00Z'), cal1).toISOString()).toBe('2026-11-16T01:00:00.000Z');

    // Quote T-2: validUntil Thứ Năm 12/11 23:59:59 ICT → raw T-2 = Thứ Ba 10/11 00:00 ICT → Thứ Ba 10/11 08:00 ICT (01:00Z).
    const validUntil = new Date('2026-11-12T16:59:59.999Z');
    expect(quoteRemindScheduledAt(validUntil, cal1).toISOString()).toBe('2026-11-10T01:00:00.000Z');
    expect(isQuoteRemindDue(validUntil, new Date('2026-11-10T00:59:00Z'), cal1)).toBe(false);
    expect(isQuoteRemindDue(validUntil, new Date('2026-11-10T01:00:00Z'), cal1)).toBe(true);

    // Invoice T+7 rơi Chủ nhật 15/11 (dueDate = 08/11) → Thứ Hai 16/11 08:00 ICT (01:00Z).
    const due = new Date('2026-11-08T00:00:00.000Z');
    expect(invoiceRemindScheduledAt(due, 7, cal1).toISOString()).toBe('2026-11-16T01:00:00.000Z');
    expect(dueInvoiceReminder(due, new Date('2026-11-15T03:00:00Z'), cal1)).toBeNull();
    expect(dueInvoiceReminder(due, new Date('2026-11-16T01:00:00Z'), cal1)?.key).toBe('T+7');

    // Appointment 24h dời vs 2h MIỄN: lịch lúc Thứ Tư 11/11 22:00 ICT (15:00Z).
    const apptAt = new Date('2026-11-11T15:00:00.000Z');
    expect(appointmentRemindScheduledAt(apptAt, { key: 'h24', before: 24 * 60 }, cal1).toISOString()).toBe('2026-11-11T01:00:00.000Z');
    expect(appointmentRemindScheduledAt(apptAt, { key: 'h2', before: 2 * 60 }, cal1).toISOString()).toBe('2026-11-11T13:00:00.000Z');
    expect(dueAppointmentReminder(apptAt, new Date('2026-11-10T15:00:00Z'), [], cal1)).toBeNull();
    expect(dueAppointmentReminder(apptAt, new Date('2026-11-11T13:05:00Z'), ['h24'], cal1)?.key).toBe('h2');
  });

  it('sweepQuotes dời T-2 ngoài giờ (22:00) sang 08:00 sáng làm việc kế tiếp, mỗi báo giá một lần', async () => {
    // 2026-11-10 = Thứ Ba 22:00 ICT (15:00Z); validUntil = Thứ Năm 12/11 23:59:59 ICT.
    const clock = new FixedClock('2026-11-10T15:00:00.000Z');
    const h = makeHarness(clock);
    h.quotes.push({ id: '11111111-1111-7111-8111-111111111111', validUntil: new Date('2026-11-12T16:59:59.999Z'), remindedAt: null });

    expect((await sweepQuotes(h.deps)).reminded).toBe(0);
    expect(h.sent).toHaveLength(0);

    // 2026-11-11 08:00 ICT (01:00Z) — đầu giờ làm việc Thứ Tư.
    clock.set('2026-11-11T01:00:00.000Z');
    expect((await sweepQuotes(h.deps)).reminded).toBe(1);
    expect(h.sent).toEqual([{ actionId: 'quote.system_transition', targetId: '11111111-1111-7111-8111-111111111111', milestone: 'T-2', at: '2026-11-11T01:00:00.000Z' }]);

    // Quét lại lúc 08:05 ICT → idempotent = 0.
    clock.advance(5 * 60_000);
    expect((await sweepQuotes(h.deps)).reminded).toBe(0);
  });

  it('sweepPayments dời T-1 / T+1 ngoài giờ (22:00) và T+7 rơi Chủ nhật sang Thứ Hai 08:00', async () => {
    // 2026-11-11 00:30 ICT (17:30Z 10/11) — đêm ngoài giờ:
    // - Đề nghị A: dueDate = 2026-11-10 (Thứ Ba) → T+1 = 11/11 00:00 ICT (đã tới lúc 00:30 nhưng hoãn tới 08:00).
    // - Đề nghị B: dueDate = 2026-11-08 (Chủ nhật) → đã T+1 từ trước; tới Chủ nhật 15/11 chạm T+7 → hoãn sang Thứ Hai 16/11 08:00 ICT.
    // - Đề nghị C: dueDate = 2026-11-12 (Thứ Năm) → T-1 = 11/11 00:00 ICT (hoãn tới 08:00).
    const clock = new FixedClock('2026-11-10T17:30:00.000Z');
    const h = makeHarness(clock);
    h.invoices.push(
      { id: '22222222-2222-7222-8222-222222222221', dueDate: new Date('2026-11-10T00:00:00.000Z') },
      { id: '22222222-2222-7222-8222-222222222222', dueDate: new Date('2026-11-08T00:00:00.000Z') },
      { id: '22222222-2222-7222-8222-222222222223', dueDate: new Date('2026-11-12T00:00:00.000Z') },
    );

    // Đêm 00:30 ngoài giờ: hoãn toàn bộ.
    expect((await sweepPayments(h.deps)).reminded).toBe(0);

    // Thứ Tư 2026-11-11 08:00 ICT (01:00Z): A (T+1), B (T+1), C (T-1) cùng chạy ở sáng làm việc; quét lại 08:05 → 0.
    clock.set('2026-11-11T01:00:00.000Z');
    expect((await sweepPayments(h.deps)).reminded).toBe(3);
    expect(h.sent.map((x) => `${x.targetId.slice(-1)}:${x.milestone}`)).toEqual(['1:T+1', '2:T+1', '3:T-1']);
    clock.advance(5 * 60_000);
    expect((await sweepPayments(h.deps)).reminded).toBe(0);

    // Thứ Sáu 2026-11-13 08:00 ICT (01:00Z): Đề nghị C (due 12/11) gửi mốc T+1.
    clock.set('2026-11-13T01:00:00.000Z');
    expect((await sweepPayments(h.deps)).reminded).toBe(1);
    expect(h.sent.at(-1)).toMatchObject({ targetId: '22222222-2222-7222-8222-222222222223', milestone: 'T+1' });

    // Chủ nhật 2026-11-15 10:00 ICT (03:00Z): ngoài giờ làm việc → Đề nghị B (T+7) bị hoãn.
    clock.set('2026-11-15T03:00:00.000Z');
    expect((await sweepPayments(h.deps)).reminded).toBe(0);

    // Thứ Hai 2026-11-16 08:00 ICT (01:00Z): Đề nghị B gửi T+7 dù đã sang T+8 lịch; quét lại lúc 08:30 → 0.
    clock.set('2026-11-16T01:00:00.000Z');
    expect((await sweepPayments(h.deps)).reminded).toBe(1);
    expect(h.sent.at(-1)).toMatchObject({ targetId: '22222222-2222-7222-8222-222222222222', milestone: 'T+7' });
    clock.advance(30 * 60_000);
    expect((await sweepPayments(h.deps)).reminded).toBe(0);
  });

  it('sweepBooking dời h24 khi rơi lúc 22:00 sang 08:00, nhưng MIỄN dời h2 (gửi ngay lúc 20:00)', async () => {
    // Lịch hẹn Thứ Tư 2026-11-11 22:00 ICT (15:00Z):
    // - Mốc h24 = Thứ Ba 22:00 ICT (15:00Z 10/11) → hoãn tới Thứ Tư 08:00 ICT (01:00Z 11/11).
    // - Mốc h2  = Thứ Tư 20:00 ICT (13:00Z 11/11, ngoài 08:00–18:00) → MIỄN → gửi ngay lập tức lúc 20:00 ICT!
    const clock = new FixedClock('2026-11-10T15:00:00.000Z');
    const h = makeHarness(clock);
    h.appts.push({ id: '33333333-3333-7333-8333-333333333331', startAt: new Date('2026-11-11T15:00:00.000Z'), sent: [] });

    // 22:00 Thứ Ba (ngoài giờ): hoãn h24.
    expect((await sweepBooking(h.deps)).reminded).toBe(0);

    // 08:00 Thứ Tư (vào giờ làm việc): gửi h24; 08:10 quét lại → 0.
    clock.set('2026-11-11T01:00:00.000Z');
    expect((await sweepBooking(h.deps)).reminded).toBe(1);
    expect(h.sent.at(-1)).toMatchObject({ targetId: '33333333-3333-7333-8333-333333333331', milestone: 'h24' });
    clock.advance(10 * 60_000);
    expect((await sweepBooking(h.deps)).reminded).toBe(0);

    // 20:00 Thứ Tư (ngoài giờ làm việc 08:00–18:00): h2 MIỄN dời → gửi ngay!
    clock.set('2026-11-11T13:00:00.000Z');
    expect((await sweepBooking(h.deps)).reminded).toBe(1);
    expect(h.sent.at(-1)).toMatchObject({ targetId: '33333333-3333-7333-8333-333333333331', milestone: 'h2' });
  });
});
