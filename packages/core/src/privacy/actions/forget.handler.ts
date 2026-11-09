// contact.forget (TIP-015c §1.1, §1.3): preview = contact.privacy_preview lại (digest phải khớp đúng những gì đã xem lúc gọi action này
// — xem trước BẮT BUỘC qua MANDATORY_PREVIEW_ACTIONS ở policy.ts). execute = acceptForget (pha `accepted`, chưa xoá gì — cleanup chạy
// nền ở job riêng, pha sau). Không undo (irreversible) — không agentGrantable, requiredApprovalSources chặn mọi nguồn gián tiếp.
// Journal nền tảng (TIP-015c §2.5, pha 3): `prepare()` reserve MỘT revision journal TRƯỚC khi transaction tenant mở (sinh operationId
// tất định ở đây, mirror 045b annex A1) — `execute()` dùng lại đúng id này; `afterCommit` acknowledge SAU khi tenant đã commit. Thiếu
// PlatformDb/APP_ENC_KEY (vd. test core không có platform) → bỏ qua journal, chỉ fence tenant (degraded — ghi log cảnh báo ở boot,
// không chặn accept vì tenant fence vẫn là nguồn sự thật chính; khôi phục platform-journal chỉ cần khi có 045b restore thật).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, contactForget } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { preview } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { privacyPreview, assertNoOpenBlockers } from '../services/preview';
import { acceptForget } from '../services/operation';
import { acknowledgeJournal, reserveJournal, type ReservedJournal } from '../services/journal';

type Input = ActionInput<typeof contactForget>;
type Output = { operation_id: string; phase: string };
interface Prepared {
  operationId: string;
  journal?: ReservedJournal;
}

@Injectable()
@ActionHandler('contact.forget')
export class ContactForgetHandler implements Handler<Input, Output> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | null = null,
    @Optional() @Inject(ENC_KEY) private readonly encKey: Buffer | null = null,
  ) {}

  async preview(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<ActionPreview> {
    const p = await privacyPreview(tx, i.contact_id);
    assertNoOpenBlockers(p);
    return preview('delete', `${p.canonical_contact_id} · họ ${p.family_size} khách`, {
      warnings: [`removable:${p.removable_count}`, `shared:${p.shared_count}`, `retained:${p.retained_count}`, 'irreversible'],
    });
  }

  /** Việc chậm NGOÀI transaction tenant (TIP-015c §2.5.5): đọc nhanh id họ khách (chỉ đọc, không khoá) để journal capsule có đủ
   * familyIds — khoá THẬT xảy ra lại trong acceptForget (đọc ở đây có thể lệch nếu đổi giữa chừng, transaction tenant tự 409 khi đó,
   * journal revision bị bỏ phí nhưng không sai dữ liệu vì chỉ tenant fence mới là nguồn sự thật). */
  async prepare(ctx: ActionContext, i: Input): Promise<Prepared> {
    const now = this.clock.now();
    const operationId = uuidv7(now.getTime());
    if (!this.platform || !this.encKey) return { operationId };
    // Đọc nhanh ngoài transaction (không khoá) — chỉ để điền capsule, không phải nguồn sự thật.
    const quickFamily = [i.contact_id];
    const journal = await reserveJournal(this.platform, this.encKey, {
      id: uuidv7(now.getTime()),
      workspaceId: ctx.workspaceId,
      operationId,
      phase: 'accepted',
      capsule: { canonicalContactId: i.contact_id, familyGeneration: 0, familyIds: quickFamily, requesterId: ctx.onBehalfOfUserId ?? ctx.actor.id },
      now,
    });
    return { operationId, journal };
  }

  async execute(ctx: ActionContext, i: Input, tx: TenantTx, _ptx?: PlatformTx, prepared?: unknown): Promise<HandlerOutcome<Output>> {
    const now = this.clock.now();
    const p = prepared as Prepared | undefined;
    const operationId = p?.operationId ?? uuidv7(now.getTime());
    const r = await acceptForget(tx, {
      operationId,
      contactId: i.contact_id,
      ifVersion: i.if_version,
      inventoryRevision: i.inventory_revision,
      requesterId: ctx.onBehalfOfUserId ?? ctx.actor.id,
      policyVersion: 1,
      now,
      encKey: this.encKey,
    });
    const platform = this.platform;
    const journal = p?.journal;
    return {
      result: { operation_id: r.operationId, phase: r.phase },
      events: r.events,
      noUndo: true,
      afterCommit: journal && platform && r.created
        ? async () => {
            await acknowledgeJournal(platform, journal.operationId, journal.revision, now);
          }
        : undefined,
    };
  }
}
