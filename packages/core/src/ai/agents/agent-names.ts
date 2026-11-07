// Port `AgentNames` của channels (TIP-014, DC-076): tên AI Agent theo id cho trang Kênh / drawer quản lý tài khoản; kiểm agent
// tồn tại khi gán cho tài khoản kênh / widget.
import { AppError } from '@appchat/shared';
import type { AgentNames } from '../../channels/services/read.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DB_AGENT_NAMES: AgentNames = {
  async names(db, ids) {
    const ok = ids.filter((id) => UUID.test(id));
    if (!ok.length) return new Map();
    const rows = await db.aiAgent.findMany({ where: { id: { in: ok }, deletedAt: null }, select: { id: true, name: true } });
    return new Map(rows.map((r) => [r.id, r.name]));
  },
};

/** Gán agent cho tài khoản kênh / widget (DC-076): id phải là agent còn sống — sai → 404 `agent_id`. Rỗng = bỏ gán. */
export async function assertAgentAssignable(db: Pick<Parameters<AgentNames['names']>[0], 'aiAgent'>, id: string | undefined): Promise<void> {
  if (!id) return;
  const a = UUID.test(id) ? await db.aiAgent.findUnique({ where: { id }, select: { deletedAt: true } }) : null;
  if (!a || a.deletedAt) throw new AppError('NOT_FOUND', 404, { agent_id: 'not_found' });
}
