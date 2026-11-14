// TIP-022c §4.1 (AC8): mẫu agent Sales rev 3 — thêm `stock.get` + `quote.request_revision` vào ĐÚNG bộ rev 2 (giữ mọi id khác, thứ tự rev 2),
// mọi id tồn tại + agentGrantable, không tool tiền / xoá; nâng mẫu dựng sẵn rev 1 / rev 2 chưa sửa → rev 3; mẫu quản trị đã sửa giữ nguyên +
// xem trước thay thế; vai trò khác giữ bộ rev 2; agent đã tạo không đổi (mẫu chỉ là gợi ý — giao với quyền người tạo áp lúc tạo / xuất bản).
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { ROLE_DEFAULTS, ROLE_DEFAULTS_V1, ROLE_DEFAULTS_V2, SALES_TOOLS_V2, SALES_TOOLS_V3, TEMPLATE_REVISION, invalidTemplateTools, planUpgrade, replacementPreview } from '../src/ai/agents/template-revisions';
import { templateDefaults } from '../src/ai/agents/templates.seed';
import { assertTools } from '../src/ai/agents/agent.store';
import { authzForRole } from '@appchat/shared';

describe('mẫu Sales rev 3', () => {
  it('= rev 2 + stock.get + quote.request_revision (giữ thứ tự / mọi id rev 2); không tiền / xoá; mọi id cấp được', () => {
    expect(TEMPLATE_REVISION).toBe(3);
    expect(SALES_TOOLS_V3.filter((t) => !SALES_TOOLS_V2.includes(t))).toEqual(['stock.get', 'quote.request_revision']);
    expect(SALES_TOOLS_V3.filter((t) => SALES_TOOLS_V2.includes(t))).toEqual(SALES_TOOLS_V2);
    expect(SALES_TOOLS_V3).toHaveLength(27);
    expect(new Set(SALES_TOOLS_V3).size).toBe(27);
    expect(invalidTemplateTools()).toEqual([]);
    const risk = new Map(registry.map((a) => [a.id, a.risk]));
    expect(SALES_TOOLS_V3.filter((id) => ['money', 'delete'].includes(risk.get(id) ?? ''))).toEqual([]);
    expect(templateDefaults('sales')).toMatchObject({ tools: SALES_TOOLS_V3, revision: 3 });
    for (const role of ['cs', 'booking', 'marketing', 'accounting', 'ops']) expect(ROLE_DEFAULTS[role]!.tools).toEqual(ROLE_DEFAULTS_V2[role]!.tools);
  });

  it('nâng: dựng sẵn rev 1 / rev 2 → rev 3; đã sửa → customized; đã rev 3 → current; xem trước thay thế liệt kê thêm', () => {
    expect(planUpgrade('sales', { tools: ROLE_DEFAULTS_V1.sales!.tools, prompt: 'p' })).toEqual({ kind: 'upgraded', next: { tools: SALES_TOOLS_V3, prompt: 'p', revision: 3 } });
    expect(planUpgrade('sales', { tools: SALES_TOOLS_V2, revision: 2 })).toEqual({ kind: 'upgraded', next: { tools: SALES_TOOLS_V3, revision: 3 } });
    expect(planUpgrade('sales', { tools: [...SALES_TOOLS_V2, 'contact.tag'], revision: 2 })).toEqual({ kind: 'customized' });
    expect(planUpgrade('sales', { tools: SALES_TOOLS_V3, revision: 3 })).toEqual({ kind: 'current' });
    expect(planUpgrade('booking', { tools: ROLE_DEFAULTS_V2.booking!.tools, revision: 2 })).toMatchObject({ kind: 'upgraded', next: { tools: ROLE_DEFAULTS_V2.booking!.tools, revision: 3 } });
    expect(replacementPreview('sales', { tools: SALES_TOOLS_V2 })).toEqual({ add: ['stock.get', 'quote.request_revision'], remove: [], revision: 3 });
  });

  it('giao với quyền người tạo: CSKH (không quote.create) không được gán quote.request_revision; Sales gán được cả hai', () => {
    expect(() => assertTools(['stock.get', 'quote.request_revision'], authzForRole('sales', 'u1'))).not.toThrow();
    expect(() => assertTools(['quote.request_revision'], authzForRole('cs', 'u1'))).toThrow();
  });
});
