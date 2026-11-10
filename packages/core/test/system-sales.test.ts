// TIP-003c §1.3, §3.2 (AC2–3): trigger họ sales tất định theo nguồn bền + thế hệ domain; verifier đọc lại nguồn đã lưu — thế hệ đổi
// (gia hạn báo giá / đổi hạn đề nghị thanh toán) → 409, thực thể đã xoá → 404, input đúc lại (trigger_id / operation khác) → 409.
import { describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { invoiceOverdueTrigger, invoiceRemindTrigger, packageGrantTrigger, quoteExpireTrigger, quoteRemindTrigger, quoteViewTrigger, verifySalesTrigger } from '../src/sales/system/sources';

const WS = '0190f000-0000-7000-8000-00000000aa01';
const Q = '0190f000-0000-7000-8000-00000000a001';
const EV = '0190f000-0000-7000-8000-00000000e001';
const valid = new Date('2026-11-20T00:00:00Z');
const conflict = { httpStatus: 409 };

const db = (o: { quote?: unknown; invoice?: unknown; event?: unknown; order?: unknown }) =>
  ({
    quote: { findUnique: vi.fn(async () => o.quote ?? null) },
    invoice: { findUnique: vi.fn(async () => o.invoice ?? null) },
    outboxEvent: { findUnique: vi.fn(async () => o.event ?? null) },
    order: { findUnique: vi.fn(async () => o.order ?? null) },
  }) as unknown as TenantDb;

describe('trigger sales', () => {
  it('cùng nguồn + thế hệ → cùng khoá; thế hệ / mốc khác → khoá khác', () => {
    expect(quoteExpireTrigger(WS, { id: Q, validUntil: valid }).idempotencyKey).toBe(quoteExpireTrigger(WS, { id: Q, validUntil: valid }).idempotencyKey);
    expect(quoteExpireTrigger(WS, { id: Q, validUntil: valid }).idempotencyKey).not.toBe(quoteExpireTrigger(WS, { id: Q, validUntil: new Date('2026-11-25T00:00:00Z') }).idempotencyKey);
    expect(invoiceRemindTrigger(WS, { id: Q, dueDate: valid }, 'D-3').idempotencyKey).not.toBe(invoiceRemindTrigger(WS, { id: Q, dueDate: valid }, 'D0').idempotencyKey);
    expect(quoteRemindTrigger(WS, { id: Q, validUntil: valid }).milestone).toBe('T-2');
    expect(quoteViewTrigger(WS, { id: Q, sentAt: valid }).sourceKind).toBe('public_locator');
  });
});

describe('verifySalesTrigger', () => {
  it('báo giá được gia hạn sau khi quét → 409; đã xoá → 404; đúng hạn → qua', async () => {
    const t = quoteExpireTrigger(WS, { id: Q, validUntil: valid });
    await expect(verifySalesTrigger(t, db({ quote: { validUntil: new Date('2026-11-30T00:00:00Z'), sentAt: null, deletedAt: null } }))).rejects.toMatchObject(conflict);
    await expect(verifySalesTrigger(t, db({ quote: { validUntil: valid, sentAt: null, deletedAt: new Date() } }))).rejects.toMatchObject({ httpStatus: 404 });
    await expect(verifySalesTrigger(t, db({ quote: { validUntil: valid, sentAt: null, deletedAt: null } }))).resolves.toBeUndefined();
  });

  it('input đúc lại (đổi operation giữ trigger_id) → 409 trước khi đọc DB', async () => {
    const t = invoiceOverdueTrigger(WS, { id: Q, dueDate: valid });
    const d = db({ invoice: { dueDate: valid } });
    await expect(verifySalesTrigger({ ...t, input: { ...t.input, operation: 'remind' } }, d)).rejects.toMatchObject(conflict);
    expect((d as unknown as { invoice: { findUnique: ReturnType<typeof vi.fn> } }).invoice.findUnique).not.toHaveBeenCalled();
  });

  it('cấp gói: nguồn phải là event order.confirmed đã lưu đúng đơn (không tin payload job)', async () => {
    const t = packageGrantTrigger(WS, EV, Q);
    await expect(verifySalesTrigger(t, db({ event: { topic: 'order.created', payload: { order_id: Q } }, order: { id: Q } }))).rejects.toMatchObject({ httpStatus: 404 });
    await expect(verifySalesTrigger(t, db({ event: { topic: 'order.confirmed', payload: { order_id: 'khác' } }, order: { id: Q } }))).rejects.toMatchObject({ httpStatus: 404 });
    await expect(verifySalesTrigger(t, db({ event: { topic: 'order.confirmed', payload: { order_id: Q } }, order: { id: Q } }))).resolves.toBeUndefined();
  });
});
