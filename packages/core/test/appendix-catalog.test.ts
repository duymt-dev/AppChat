// TIP-030b F3 spec 15 / extra acceptance: action nội bộ của trang ký công khai phụ lục không lộ ở mọi đường khám phá — find_actions (Owner,
// mọi chế độ, cả khi đã có handler thật), danh sách tool cấp được cho agent (Builder), SYSTEM_ONLY. agentGrantable=false không phải rào chắn
// duy nhất: gọi thẳng vẫn bị handler từ chối khi thiếu capability (appendix-public-capability.test.ts + ma trận integration).
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { authzForRole } from '@appchat/shared';
import { SYSTEM_ONLY, allowedFor, findActions } from '../src/ai/assistant/catalog';
import { groupTools, runToolIds } from '../src/ai/agents/agent-tools';

const PUBLIC = ['contract.appendix_public_otp', 'contract.appendix_public_sign', 'contract.appendix_public_decline'];
const owner = authzForRole('owner', 'u1');
const all = () => true;

describe('phụ lục — action công khai ẩn khỏi khám phá', () => {
  it('có trong registry, permission self, không agentGrantable, nằm trong SYSTEM_ONLY', () => {
    for (const id of PUBLIC) {
      const d = registry.find((a) => a.id === id)!;
      expect(d).toMatchObject({ permission: 'self', agentGrantable: false });
      expect(SYSTEM_ONLY.has(id)).toBe(true);
      expect(allowedFor(d, owner)).toBe(false);
    }
  });

  it('find_actions (Owner, cowork + chat, mọi từ khoá liên quan) không trả action công khai; action phụ lục nội bộ vẫn thấy', () => {
    const found = new Set<string>();
    for (const q of ['ký phụ lục', 'appendix public sign', 'otp phụ lục khách', 'từ chối ký phụ lục', 'contract appendix']) {
      for (const mode of ['cowork', 'chat'] as const) for (const f of findActions(owner, mode, q, undefined, 50, all)) found.add(f.id);
    }
    expect(PUBLIC.filter((id) => found.has(id))).toEqual([]);
    expect(found.has('contract.create_appendix')).toBe(true);
  });

  it('Builder AI Agents không liệt kê action công khai / ký phụ lục của Owner', () => {
    const ids = groupTools([], new Set()).flatMap((g) => g.tools.map((t) => t.id));
    const blocked = [...PUBLIC, 'contract.appendix_approve_and_sign', 'contract.appendix_send', 'contract.appendix_owner_otp'];
    for (const id of blocked) expect(ids).not.toContain(id);
    expect(ids).toContain('contract.create_appendix');
    // Cấp thẳng id (cấu hình giả mạo) cũng không lọt vào run của agent.
    expect(runToolIds(blocked, new Set())).toEqual([]);
  });
});
