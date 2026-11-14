// Kết quả gửi chiến dịch (TIP-037, ROLE=channels): chốt chặn `cr_` của worker gửi — đặt chỗ ngay trước kênh (campaign-dispatch), sổ một
// phần (lỗi chắc chắn → mở lại để thử; chưa rõ → unknown), ghi kết quả qua action hệ thống campaign.record_delivery (Executor — audit +
// outbox, Idempotency theo ref + kết quả: phát lại không ghi đôi). Kết quả `cr_` không đi qua sink Inbox.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { SendGuard, SendResult } from '../../channels/public';
import { MARKETING_ACTORS, systemCtx } from '../services/marketing-system';
import { recipientOfRef, reserveRecipient } from './campaign-dispatch';

export interface GuardDeps {
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
}

/** Chốt chặn `cr_` của worker gửi (ROLE=channels): đặt chỗ + ghi kết quả qua Executor. */
export function campaignSendGuard(d: GuardDeps): SendGuard {
  const record = (ws: string, ref: string, outcome: 'accepted' | 'unknown' | 'failed', definite: boolean, extra: { external_msg_id?: string; error?: string } = {}) =>
    d.executor.execute(systemCtx(ws, MARKETING_ACTORS.delivery, `${ref}:${outcome}:${definite ? 1 : 0}`), 'campaign.record_delivery', { delivery_ref: ref, outcome, definite, ...extra });
  return {
    async reserve(ws, ref) {
      const id = recipientOfRef(ref);
      if (!id) return false;
      const db = await d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
      const r = await reserveRecipient(db, id, d.now());
      if (r === 'already') await record(ws, ref, 'unknown', false, { error: 'interrupted_after_attempt' });
      return r === 'reserved';
    },
    // Sổ một phần: lỗi chắc chắn (kênh từ chối rõ) → mở lại đặt chỗ để BullMQ thử lại; lỗi chưa rõ → unknown (worker phát kết quả final).
    async book(ws, _accountId, job) {
      const id = recipientOfRef(job.ref_id);
      if (!id) return null;
      const db = await d.tenants.get(TenantContexts.fromRoute(ws, 'channel'));
      return {
        ledger: { reserve: async () => 'send' as const, confirm: async () => undefined },
        async fail(definite) {
          await db.campaignRecipient.updateMany({ where: { id, sendState: 'reserved' }, data: { sendState: definite ? 'none' : 'unknown', updatedAt: d.now() } });
          return 1;
        },
      };
    },
    async result(r: SendResult) {
      if (r.ok) return void (await record(r.ws, r.ref_id, 'accepted', true, { external_msg_id: r.external_msg_id.slice(0, 200) }));
      // Một phần / chưa rõ đã tới khách → unknown (không gửi lại); lỗi thường chưa final → BullMQ còn thử lại, chưa ghi.
      if (r.outcome) return void (await record(r.ws, r.ref_id, 'unknown', false, { error: r.error.slice(0, 200) }));
      if (!r.final) return;
      await record(r.ws, r.ref_id, 'failed', true, { error: r.error.slice(0, 200) });
    },
  };
}
