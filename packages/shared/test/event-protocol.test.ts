// TIP-003b AC1: mọi topic khai báo có đúng một ánh xạ aggregate đã kiểm; topic lạ / workspace sai / payload sai lỗi TRƯỚC commit.
import { describe, expect, it } from 'vitest';
import { AGGREGATE_RULES, EVENT_SCHEMAS, EventProtocolError, MAX_PAYLOAD_BYTES, eventMetadata, extensionTopics, isDeclaredTopic, NOTIFY_KIND_KEYS } from '../src';

const ws = '0190f2a0-0000-7000-8000-000000000001';
const id = '0190f2a0-0000-7000-8000-0000000000aa';
const ev = '0190f2a0-0000-7000-8000-0000000000ee';
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as EventProtocolError).code;
  }
  return 'ok';
};

describe('bảng aggregate', () => {
  it('khớp ĐÚNG tập topic của EVENT_SCHEMAS (không thừa, không thiếu)', () => {
    expect(Object.keys(AGGREGATE_RULES).sort()).toEqual(Object.keys(EVENT_SCHEMAS).sort());
  });

  it('mọi nhóm mở rộng đều nằm trong EVENT_SCHEMAS', () => {
    for (const t of extensionTopics()) expect(isDeclaredTopic(t), t).toBe(true);
  });

  it('topic đang phát trước đây chưa khai đã có schema (workspace.ready, tag.created, …)', () => {
    for (const t of ['workspace.ready', 'tag.created', 'workspace.activity', 'assistant.turn_requested', 'contact.privacy_requested', 'bank_receipt.accepted', 'contact_task.created']) expect(isDeclaredTopic(t), t).toBe(true);
  });

  it('trường khoá của mọi luật (trừ ws / event_id) có trong schema của topic', () => {
    for (const [topic, rule] of Object.entries(AGGREGATE_RULES)) {
      if (rule.key === 'ws' || rule.key === 'event_id') continue;
      const shape = (EVENT_SCHEMAS[topic as keyof typeof EVENT_SCHEMAS] as unknown as { shape: Record<string, unknown> }).shape;
      expect(Object.keys(shape), topic).toContain(rule.key);
    }
  });
});

describe('eventMetadata', () => {
  const base = { ws, occurred_at: '2026-11-11T00:00:00.000Z' };

  it('aggregate theo luật tường minh: tin nhắn → hội thoại (không message_id); hoàn tiền → payment', () => {
    const conv = '0190f2a0-0000-7000-8000-0000000000c1';
    const m = eventMetadata('message.sent', { ...base, conversation_id: conv, channel_account_id: id, contact_id: null, assignee_user_id: null, contact_owner_user_id: null, message_id: id, sender_type: 'user', sender_id: null }, ws, ev);
    expect(m).toMatchObject({ aggregateKind: 'conversation', aggregateId: conv });
    const r = eventMetadata('payment.refunded', { ...base, payment_id: id, invoice_id: null, order_id: null, package_id: null, contact_id: conv, amount: '1000' }, ws, ev);
    expect(r).toMatchObject({ aggregateKind: 'payment', aggregateId: id });
  });

  it('vòng đời workspace → id workspace đã xác thực; workspace_id khác → lỗi', () => {
    expect(eventMetadata('workspace.ready', { ...base, workspace_id: ws }, ws, ev)).toMatchObject({ aggregateKind: 'workspace_lifecycle', aggregateId: ws });
    expect(code(() => eventMetadata('workspace.ready', { ...base, workspace_id: id }, ws, ev))).toBe('EVENT_WORKSPACE_MISMATCH');
  });

  it('notify.requested là ý định độc lập — stream = event_id', () => {
    expect(eventMetadata('notify.requested', { ...base, kind: NOTIFY_KIND_KEYS[0], to: { user_ids: [id] }, params: {} }, ws, ev)).toMatchObject({ aggregateKind: 'notification_intent', aggregateId: ev });
  });

  it('tag.created dùng trường id khai tường minh', () => {
    expect(eventMetadata('tag.created', { ...base, id }, ws, ev)).toMatchObject({ aggregateKind: 'tag', aggregateId: id });
  });

  it('lỗi trước commit: topic lạ, payload sai, ws payload khác, quá 128 KiB', () => {
    expect(code(() => eventMetadata('nope.happened', base, ws, ev))).toBe('EVENT_TOPIC_UNKNOWN');
    expect(code(() => eventMetadata('order.created', { ...base, order_id: 'x' }, ws, ev))).toBe('EVENT_PAYLOAD_INVALID');
    expect(code(() => eventMetadata('tag.created', { ...base, ws: id, id }, ws, ev))).toBe('EVENT_WORKSPACE_MISMATCH');
    expect(code(() => eventMetadata('tag.created', { ...base, id, pad: 'x'.repeat(MAX_PAYLOAD_BYTES) }, ws, ev))).toBe('EVENT_PAYLOAD_TOO_LARGE');
  });

  it('giữ trường ngoài schema (không âm thầm cắt scope / provenance) và không giữ tham chiếu của caller', () => {
    const p = { ...base, id, extra: { scope: 'own' } };
    const m = eventMetadata('tag.created', p, ws, ev);
    expect(m.payload.extra).toEqual({ scope: 'own' });
    expect(m.payload.extra).not.toBe(p.extra);
  });
});
