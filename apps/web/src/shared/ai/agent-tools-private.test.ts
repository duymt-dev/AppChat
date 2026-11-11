// TIP-003c §1.5: Builder Tools (web) không liệt kê action riêng (`exposure: 'internal'`) — kể cả khi cấu hình cũ có id đó.
import { describe, expect, it } from 'vitest';
import { isInternalAction, registry } from '@appchat/actions';
import { AGENT_GRANTABLE, MODULE_ACTIONS, SKILL_ACTIONS } from './agent-tools';

describe('agent-tools — action riêng', () => {
  it('không action internal nào trong danh sách cấp được', () => {
    const internal = registry.filter(isInternalAction).map((a) => a.id);
    expect(internal.length).toBeGreaterThan(0);
    for (const list of [AGENT_GRANTABLE, MODULE_ACTIONS, SKILL_ACTIONS]) for (const a of list) expect(internal, a.id).not.toContain(a.id);
  });
});
