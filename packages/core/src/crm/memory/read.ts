// Đọc trí nhớ khách (TIP-015b): `contact.memory_list` (Trợ lý / agent / khối "AI ghi nhớ") + `recentFacts` cho ngữ cảnh agent. Cùng
// `visibleContact` với Hồ sơ 360° (ngoài scope → 404, không lộ fact). Deferred IDs-first: lấy id theo index (contact_id, updated_at DESC, id DESC)
// rồi mới đọc chữ — tối đa 50 (trần) / 20 (ngữ cảnh).
import { Injectable } from '@nestjs/common';
import type { ActionInput, ActionOutput, ActionPreview, contactMemoryList } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview } from '../../kernel/actions/preview-kit';
import { visibleContact } from '../services/access';
import { MEMORY_CAP } from './normalize';

type Out = ActionOutput<typeof contactMemoryList>;
type Fact = Out['items'][number];

interface Row {
  id: string;
  fact: string;
  confidence: number;
  actor_type: string | null;
  updated_at: Date;
}

/** Fact mới nhất của khách (deferred join — chữ chỉ đọc cho `limit` dòng). */
export async function recentFacts(db: Pick<TenantDb, '$queryRaw'>, contactId: string, limit: number): Promise<Row[]> {
  return db.$queryRaw<Row[]>`
    SELECT m.id, m.fact, m.confidence, m.actor_type, m.updated_at
    FROM (SELECT id FROM contact_memory WHERE contact_id = ${contactId}::uuid ORDER BY updated_at DESC, id DESC LIMIT ${limit}) s
    JOIN contact_memory m ON m.id = s.id
    ORDER BY m.updated_at DESC, m.id DESC`;
}

export const sourceOf = (t: string | null): Fact['source'] => (t === 'agent' || t === 'user' ? t : 'system');

@Injectable()
@ActionHandler('contact.memory_list')
export class ContactMemoryListHandler implements Handler<ActionInput<typeof contactMemoryList>, Out> {
  async execute(ctx: ActionContext, i: ActionInput<typeof contactMemoryList>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { contact, writable } = await visibleContact(tx, ctx.authz, i.contact_id);
    const rows = await recentFacts(tx, contact.id, MEMORY_CAP);
    return {
      result: {
        items: rows.map((r) => ({ memory_id: r.id, fact: r.fact, confidence: r.confidence, source: sourceOf(r.actor_type), updated_at: r.updated_at.toISOString() })),
        cap: MEMORY_CAP,
        can_edit: writable && ctx.authz.permissions.has('crm.edit'),
      },
    };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof contactMemoryList>, tx: TenantTx): Promise<ActionPreview> {
    const { contact } = await visibleContact(tx, ctx.authz, i.contact_id);
    return preview('read', `${contact.code} · ${contact.name}`, { count: await tx.contactMemory.count({ where: { contactId: contact.id } }) });
  }
}
