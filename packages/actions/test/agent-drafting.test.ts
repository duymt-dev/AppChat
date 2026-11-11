// TIP-021b §1.1, §3.1: hợp đồng `agent.draft_from_description` — agents.manage / read / không cấp cho agent; input bắt buộc request_id UUID
// + mô tả 4–2000; output `{ draft, generation_info }` với mode / lý do / cảnh báo đóng; config schema một nguồn (agent.create dùng chung).
import { describe, expect, it } from 'vitest';
import { agentConfig, agentCreate, agentDraftFromDescription, draftGenerationInfo, DRAFT_SCHEMA_VERSION, getAction, registry } from '../src';

const RID = '5f0e7c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b';
const info = { schema_version: DRAFT_SCHEMA_VERSION, operation_id: 'op', mode: 'model', discovery_strategy: 'keyword', warnings: ['keyword_discovery'], candidate_version: 'f' };

describe('agent.draft_from_description', () => {
  it('đăng ký đúng một lần trong registry; quyền / risk / không grantable giữ nguyên', () => {
    expect(registry.filter((a) => a.id === 'agent.draft_from_description')).toHaveLength(1);
    expect(getAction('agent.draft_from_description')).toBe(agentDraftFromDescription);
    expect(agentDraftFromDescription).toMatchObject({ permission: 'agents.manage', risk: 'read', agentGrantable: false });
  });

  it('input: request_id UUID bắt buộc, mô tả 4–2000 ký tự', () => {
    const p = (v: unknown) => agentDraftFromDescription.input.safeParse(v).success;
    expect(p({ description: 'Agent CSKH', request_id: RID })).toBe(true);
    expect(p({ description: 'Agent CSKH' })).toBe(false);
    expect(p({ description: 'Agent CSKH', request_id: 'abc' })).toBe(false);
    expect(p({ description: 'abc', request_id: RID })).toBe(false);
    expect(p({ description: 'x'.repeat(2000), request_id: RID })).toBe(true);
    expect(p({ description: 'x'.repeat(2001), request_id: RID })).toBe(false);
  });

  it('mô tả cho model có ví dụ kèm request_id (Trợ lý đọc schema từ registry)', () => {
    expect(agentDraftFromDescription.description).toContain('"request_id"');
  });

  it('output: draft theo agentConfig + generation_info đóng', () => {
    const ok = agentDraftFromDescription.output.safeParse({ draft: { name: 'A', tools: [] }, generation_info: info });
    expect(ok.success).toBe(true);
    expect(draftGenerationInfo.safeParse({ ...info, mode: 'template' }).success).toBe(false);
    expect(draftGenerationInfo.safeParse({ ...info, mode: 'deterministic', fallback_reason: 'random' }).success).toBe(false);
    expect(draftGenerationInfo.safeParse({ ...info, warnings: ['leaked_tool_name'] }).success).toBe(false);
    expect(agentDraftFromDescription.output.safeParse({ draft: { name: 'A' } }).success).toBe(false);
  });

  it('config schema một nguồn: agent.create nhận đúng bản soạn', () => {
    const draft = { name: 'CSKH', role: 'cs', tools: ['ticket.create'], threshold: 75 };
    expect(agentConfig.safeParse(draft).success).toBe(true);
    expect(agentCreate.input.safeParse(draft).success).toBe(agentConfig.safeParse(draft).success);
  });
});
