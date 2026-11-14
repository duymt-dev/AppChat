// Lượt agent trong ngữ cảnh action (TIP-045b annex D): `message.send` do agent trực kênh gọi mang fence lượt + epoch → outbox ghi lại để
// đặt chỗ gửi kiểm dưới khoá hội thoại. Người / Trợ lý / tác vụ không có lượt → tin người (không fence).
import type { ActionContext } from '../../kernel/actions/action-context';

export const agentTurnOf = (ctx: Pick<ActionContext, 'actor' | 'agentTurn'>) => (ctx.actor.type === 'agent' && ctx.agentTurn ? ctx.agentTurn : undefined);
