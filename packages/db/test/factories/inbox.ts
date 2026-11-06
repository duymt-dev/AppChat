// Factory inbox trong DB tenant (TIP-045b annex E): tài khoản kênh (mặc định webchat — không đụng phiên Zalo thật), hội thoại, tin vào.
import type { TenantDb } from '../../src';
import { newId, tag, type FactoryClock } from './clock';

export function inboxFactory(db: TenantDb, clock: FactoryClock) {
  return {
    async channelAccount(p: { type?: string; status?: 'connected' | 'disconnected' } = {}) {
      const id = newId();
      const type = p.type ?? 'webchat';
      await db.channelAccount.create({ data: { id, type, name: `Kênh ${tag()}`, status: p.status ?? 'connected', createdAt: clock.now(), updatedAt: clock.now() } });
      return { id, type };
    },
    async conversation(account: { id: string; type: string }, contactId: string | null = null) {
      const id = newId();
      await db.conversation.create({
        data: { id, channelAccountId: account.id, channelType: account.type, contactId, externalThreadId: `t-${tag()}`, createdAt: clock.now(), updatedAt: clock.now() },
      });
      return { id };
    },
    async inbound(conversationId: string, channelAccountId: string, text = 'Xin chào') {
      const id = newId();
      await db.message.create({ data: { id, conversationId, channelAccountId, senderType: 'contact', direction: 'in', body: text, externalMsgId: `m-${tag()}`, createdAt: clock.now() } });
      return { id };
    },
  };
}
