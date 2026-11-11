// TIP-023d pha 7 (unit): agent đã chọn — mức AI hiệu lực theo gói, đọc ghim từ ai_run.input (sai khuôn → bỏ), khoá run con duy nhất theo
// plan_epoch, run gốc: plan_* theo người dùng, ghi nghiệp vụ → phải giao, agent đổi bản xuất bản → AGENT_UNAVAILABLE (không rơi về agent khác).
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { eligibleTier, isSelectedChild, rootAuthority, selectedChildKey, selectedOf } from '../src/ai/assistant/plans/selected-agent';

const AG = '0190a000-0000-7000-8000-000000000001';
const U = '0190a000-0000-7000-8000-0000000000aa';

function db(agent: { status?: string; publishedVersion?: number; deletedAt?: Date | null } | null, tools: string[] = ['contact.search', 'contact.create']) {
  return {
    aiAgent: { findUnique: async () => (agent ? { id: AG, name: 'Sales Bot', status: 'active', deletedAt: null, publishedVersion: 2, ...agent } : null) },
    aiAgentVersion: { findUnique: async ({ where }: { where: { agentId_version: { version: number } } }) => ({ version: where.agentId_version.version, config: { tools, model_tier: 'max' } }) },
  } as never;
}

describe('eligibleTier / selectedOf / khoá con', () => {
  it('mức cấu hình hạ theo gói; mức lạ → standard', () => {
    expect(eligibleTier('max', 'business')).toMatch(/^(max|advanced)$/);
    expect(eligibleTier('max', 'free')).toBe('standard');
    expect(eligibleTier('weird', 'business')).toBe('standard');
  });
  it('ghim sai khuôn → undefined; đúng → giữ nguyên', () => {
    expect(selectedOf({ id: AG, version: 2, tier: 'advanced' })).toEqual({ id: AG, version: 2, tier: 'advanced' });
    expect(selectedOf({ id: 'Sales Bot', version: 2, tier: 'advanced' })).toBeUndefined();
    expect(selectedOf({ id: AG, version: '2', tier: 'advanced' })).toBeUndefined();
    expect(selectedOf(null)).toBeUndefined();
  });
  it('một run con mỗi plan_epoch', async () => {
    const key = await selectedChildKey({ assistantPlan: { findUnique: async () => ({ planEpoch: 3 }) } } as never, 'root');
    expect(key).toBe('selected:3');
    expect(await selectedChildKey({ assistantPlan: { findUnique: async () => null } } as never, 'root')).toBe('selected:0');
    expect(isSelectedChild(key)).toBe(true);
    expect(isSelectedChild('contact.create:x')).toBe(false);
  });
});

describe('rootAuthority', () => {
  const me = authzForRole('owner', U);
  const pin = { id: AG, version: 2, tier: 'standard' as const };
  it('plan_* theo người dùng; tra cứu theo agent ∩ người dùng; ghi → SELECTED_AGENT_ONLY', async () => {
    expect(await rootAuthority(db({}), pin, me, { id: 'assistant.plan_propose', risk: 'write' })).toEqual({ ok: true, authz: me });
    const read = await rootAuthority(db({}), pin, me, { id: 'contact.search', risk: 'read' });
    expect(read.ok && [...read.authz.permissions]).toEqual(expect.arrayContaining(['crm.view']));
    expect(read.ok && read.authz.isOwner).toBe(false);
    expect(await rootAuthority(db({}), pin, me, { id: 'contact.create', risk: 'write' })).toMatchObject({ ok: false, code: 'SELECTED_AGENT_ONLY' });
  });
  it('tạm dừng / xoá / xuất bản bản khác → AGENT_UNAVAILABLE', async () => {
    for (const a of [{ status: 'paused' }, { deletedAt: new Date() }, { publishedVersion: 3 }, null]) {
      expect(await rootAuthority(db(a), pin, me, { id: 'contact.search', risk: 'read' })).toMatchObject({ ok: false, code: 'AGENT_UNAVAILABLE' });
    }
  });
});
