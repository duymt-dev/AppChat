// TIP-026c §2 / AC7 (phần schema): action cơ hội — quyền / risk / agentGrantable theo DC-922 (agent là nhân viên; lưu trữ không cấp),
// `probability` / `quote_id` của 026b → issue `field_removed` (executor trả 422 fields.probability = field_removed), update không đổi
// giai đoạn, set_stage không nhận lost, Thua bắt buộc lý do 4 mã, sản phẩm ≤ 20, schema tool cho model KHÔNG lộ ô đã bỏ.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  contactOpportunityArchive,
  contactOpportunityCreate,
  contactOpportunityGet,
  contactOpportunityList,
  contactOpportunityMarkLost,
  contactOpportunityReopen,
  contactOpportunitySetOwner,
  contactOpportunitySetStage,
  contactOpportunityUpdate,
  registry,
} from '../src/index';

const C = '0190f000-0000-7000-8000-000000000001';
const O = '0190f000-0000-7000-8000-0000000000b1';
/** Như executor `zodFields`: path → code. */
const fields = (r: { success: boolean; error?: z.ZodError }) => Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.') || '_', i.code]));

describe('quyền / risk / agentGrantable (DC-922)', () => {
  it('ghi cấp được cho agent như người; lưu trữ (delete) không; đọc là kỹ năng', () => {
    const rows = [contactOpportunityCreate, contactOpportunityUpdate, contactOpportunitySetStage, contactOpportunityMarkLost, contactOpportunityReopen, contactOpportunitySetOwner, contactOpportunityArchive, contactOpportunityList, contactOpportunityGet].map(
      (d) => [d.id, d.permission, d.risk, d.agentGrantable, !!d.undo],
    );
    expect(rows).toEqual([
      ['contact_opportunity.create', 'crm.edit', 'write', true, true],
      ['contact_opportunity.update', 'crm.edit', 'write', true, true],
      ['contact_opportunity.set_stage', 'crm.edit', 'write', true, true],
      ['contact_opportunity.mark_lost', 'crm.edit', 'write', true, true],
      ['contact_opportunity.reopen', 'crm.edit', 'write', true, true],
      ['contact_opportunity.set_owner', 'crm.edit', 'write', true, true],
      ['contact_opportunity.archive', 'crm.edit', 'delete', false, true],
      ['contact_opportunity.list', 'crm.view', 'read', true, false],
      ['contact_opportunity.get', 'crm.view', 'read', true, false],
    ]);
    expect(contactOpportunityList.skill && contactOpportunityGet.skill).toBe(true);
    for (const id of ['contact_opportunity.set_stage', 'contact_opportunity.mark_lost', 'contact_opportunity.reopen', 'contact_opportunity.set_owner', 'contact_opportunity.list', 'contact_opportunity.get'])
      expect(registry.some((a) => a.id === id)).toBe(true);
  });
});

describe('field_removed — ô của TIP-026b', () => {
  it('create / update có probability hoặc quote_id → issue field_removed đúng đường dẫn', () => {
    expect(fields(contactOpportunityCreate.input.safeParse({ contact_id: C, title: 'Gói', probability: 60 }))).toEqual({ probability: 'field_removed' });
    expect(fields(contactOpportunityCreate.input.safeParse({ contact_id: C, title: 'Gói', quote_id: O }))).toEqual({ quote_id: 'field_removed' });
    expect(fields(contactOpportunityUpdate.input.safeParse({ opportunity_id: O, patch: { probability: 30 } }))).toEqual({ 'patch.probability': 'field_removed' });
  });

  it('schema tool cho model không có ô probability / quote_id', () => {
    for (const d of [contactOpportunityCreate, contactOpportunityUpdate]) {
      const json = JSON.stringify(z.toJSONSchema(d.input, { io: 'input', unrepresentable: 'any' }));
      expect(json).not.toContain('probability');
      expect(json).not.toContain('quote_id');
    }
  });
});

describe('luật input', () => {
  it('create: giai đoạn đầu tuỳ chọn, nguồn trong tập, sản phẩm ≤ 20', () => {
    expect(contactOpportunityCreate.input.safeParse({ contact_id: C, title: 'Gói', stage: 'quote', source_kind: 'conversation', items: [{ name: 'HIFU', qty: 1 }] }).success).toBe(true);
    expect(fields(contactOpportunityCreate.input.safeParse({ contact_id: C, title: 'Gói', stage: 'open' }))).toEqual({ stage: 'invalid_value' });
    expect(fields(contactOpportunityCreate.input.safeParse({ contact_id: C, title: 'Gói', source_kind: 'tiktok' }))).toEqual({ source_kind: 'invalid_value' });
    const many = Array.from({ length: 21 }, (_, i) => ({ name: `SP ${i}`, qty: 1 }));
    expect(fields(contactOpportunityCreate.input.safeParse({ contact_id: C, title: 'Gói', items: many }))).toEqual({ items: 'too_big' });
  });

  it('update: không đổi giai đoạn (use_set_stage), patch rỗng bị từ chối', () => {
    expect(fields(contactOpportunityUpdate.input.safeParse({ opportunity_id: O, patch: { stage: 'won' } }))).toEqual({ 'patch.stage': 'use_set_stage' });
    expect(contactOpportunityUpdate.input.safeParse({ opportunity_id: O, patch: {} }).success).toBe(false);
  });

  it('set_stage không nhận lost; mark_lost bắt buộc lý do 4 mã', () => {
    expect(contactOpportunitySetStage.input.safeParse({ opportunity_id: O, stage: 'won' }).success).toBe(true);
    expect(contactOpportunitySetStage.input.safeParse({ opportunity_id: O, stage: 'lost' }).success).toBe(false);
    expect(fields(contactOpportunityMarkLost.input.safeParse({ opportunity_id: O }))).toEqual({ lost_reason: 'invalid_value' });
    for (const r of ['price', 'competitor', 'no_need', 'unreachable']) expect(contactOpportunityMarkLost.input.safeParse({ opportunity_id: O, lost_reason: r }).success).toBe(true);
  });
});
