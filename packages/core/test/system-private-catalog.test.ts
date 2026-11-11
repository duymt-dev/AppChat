// TIP-003c §1.5: action internal không lọt bề mặt nào — catalog Trợ lý (kể cả Owner), kho discovery (corpus / embedding), Tools của
// agent (GRANTABLE / agent.store / agent-draft), dựng tool run. Cấu hình agent cũ chứa id internal → bị từ chối / bỏ, không lộ schema.
import { describe, expect, it } from 'vitest';
import { isInternalAction, registry, type ActionDef } from '@appchat/actions';
import { authzForRole } from '@appchat/shared';
import { allowedFor } from '../src/ai/assistant/catalog';
import { buildCorpus } from '../src/ai/assistant/discovery/corpus';
import { assertTools, grantableAction } from '../src/ai/agents/agent.store';
import { allowedTools } from '../src/ai/agents/agent-draft';
import { actionTool } from '../src/ai/runs/tools';

const internal = registry.filter(isInternalAction);
const owner = authzForRole('owner', 'u1');

describe('action riêng không lộ ra bề mặt công khai', () => {
  it('có ít nhất các id hệ thống hiện có', () => {
    expect(internal.map((a) => a.id)).toEqual(expect.arrayContaining(['bank_feed.ingest', 'privacy.cleanup_step', 'contract.appendix_public_sign']));
  });

  it('catalog Trợ lý: Owner không thấy', () => {
    for (const a of internal) expect(allowedFor(a, owner), a.id).toBe(false);
  });

  it('kho discovery không chứa id internal (kể cả đã có handler)', () => {
    const ids = buildCorpus(() => true).docs.map((d) => d.actionId);
    for (const a of internal) expect(ids, a.id).not.toContain(a.id);
  });

  it('Tools của agent: không grantable, agent.store / agent-draft từ chối id cũ', () => {
    for (const a of internal) expect(grantableAction(a.id), a.id).toBeUndefined();
    expect(() => assertTools(['bank_feed.ingest'], owner)).toThrow(expect.objectContaining({ code: 'VALIDATION_FAILED' }));
    expect(allowedTools(internal.map((a) => a.id), owner)).toEqual([]);
  });

  it('dựng tool run từ def internal → 403, không trả schema', () => {
    expect(() => actionTool(internal[0] as ActionDef, { execute: async () => ({}) as never }, () => ({}) as never)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });
});
