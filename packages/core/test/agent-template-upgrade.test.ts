// TIP-022b AC6 / E — mẫu agent rev 2: đúng bộ tool Sales / Booking đã định, mọi id tồn tại + agentGrantable (sai chính tả → đỏ); nâng
// chỉ mẫu dựng sẵn chưa sửa, mẫu quản trị đã sửa giữ nguyên + xem trước thay thế; agent đã tạo không đổi (không di trú grant).
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { BOOKING_TOOLS_V2, ROLE_DEFAULTS_V1, SALES_TOOLS_V2, TEMPLATE_REVISION, invalidTemplateTools, planUpgrade, replacementPreview } from '../src/ai/agents/template-revisions';
import { templateDefaults, upgradeAgentTemplates } from '../src/ai/agents/templates.seed';

describe('mẫu agent rev 2', () => {
  it('bộ tool Sales / Booking chính xác; mọi id tồn tại + agentGrantable; tiền / xoá không thêm', () => {
    expect(SALES_TOOLS_V2).toEqual(expect.arrayContaining(['quote.search', 'quote.get', 'quote.mark_accepted', 'quote.mark_rejected', 'order.create', 'appointment.cancel', 'ticket.create', 'message.send', 'conversation.handoff']));
    expect(SALES_TOOLS_V2).toHaveLength(25);
    expect(BOOKING_TOOLS_V2).toEqual(['contact.search', 'contact.get', 'appointment.list', 'appointment.get', 'appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'appointment.cancel', 'message.send', 'conversation.handoff']);
    expect(invalidTemplateTools()).toEqual([]);
    const risk = new Map(registry.map((a) => [a.id, a.risk]));
    expect([...SALES_TOOLS_V2, ...BOOKING_TOOLS_V2].filter((id) => ['money', 'delete'].includes(risk.get(id) ?? ''))).toEqual([]);
    expect(templateDefaults('sales')).toMatchObject({ tools: SALES_TOOLS_V2, revision: TEMPLATE_REVISION });
  });

  it('nâng: dựng sẵn rev 1 → rev 2; đã sửa → customized (giữ); đã rev 2 → current', () => {
    expect(planUpgrade('sales', { tools: ROLE_DEFAULTS_V1.sales!.tools, prompt: 'p' })).toEqual({ kind: 'upgraded', next: { tools: SALES_TOOLS_V2, prompt: 'p', revision: TEMPLATE_REVISION } });
    expect(planUpgrade('sales', { tools: ['contact.update'] })).toEqual({ kind: 'customized' });
    expect(planUpgrade('sales', { tools: SALES_TOOLS_V2, revision: 2 })).toEqual({ kind: 'current' });
    expect(replacementPreview('booking', { tools: ['appointment.create', 'contact.tag'] })).toEqual({ add: BOOKING_TOOLS_V2.filter((t) => t !== 'appointment.create'), remove: ['contact.tag'], revision: TEMPLATE_REVISION });
  });

  it('upgradeAgentTemplates: chỉ ghi mẫu chưa sửa (CAS theo nội dung cũ)', async () => {
    const rows = [
      { id: '1', key: 'tpl_1', role: 'sales', defaults: { tools: ROLE_DEFAULTS_V1.sales!.tools } },
      { id: '2', key: 'tpl_5', role: 'sales', defaults: { tools: ['contact.update', 'quote.create'] } },
      { id: '4', key: 'tpl_4', role: 'booking', defaults: { tools: BOOKING_TOOLS_V2, revision: 2 } },
    ];
    const writes: string[] = [];
    const db = {
      agentTemplate: {
        findMany: async () => rows,
        updateMany: async ({ where }: { where: { id: string } }) => (writes.push(where.id), { count: 1 }),
      },
    };
    expect(await upgradeAgentTemplates(db as never)).toEqual({ upgraded: ['tpl_1'], customized: ['tpl_5'] });
    expect(writes).toEqual(['1']);
  });
});
