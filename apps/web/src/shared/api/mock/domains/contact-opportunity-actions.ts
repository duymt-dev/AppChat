// Action cơ hội trong mock (TIP-026c §2) — cùng luật server: create (giai đoạn đầu ≠ won / lost) · update (không đổi giai đoạn —
// use_set_stage) · archive (còn chứng từ sống → 409) · set_stage (won cần chứng từ; lost dùng mark_lost) · mark_lost (lý do bắt buộc; báo giá
// đã gửi → rejected) · reopen (Thua → Đủ điều kiện) · set_owner · list / get. Undo ghi bản trước vào input như mock khác.
import { OPPORTUNITY_LOST_REASONS, OPPORTUNITY_PROBABILITY, type OpportunityStage, type SystemRole } from '@appchat/shared';
import { OPP_ME, OPP_NAMES, check, detailDto, findOpp, itemDto, liveDocs, moneyGuard, move, oppErr as err, oppList, oppNow as now, removed, type Opp, type OppStore } from './contact-opportunities';

export interface OppCtx<D> {
  store: (db: D) => OppStore;
  role: (db: D) => SystemRole;
  /** Khách sửa được (ném 404 nếu không thấy / không sửa được). */
  writable: (db: D, contactId: string) => void;
  visible: (db: D, contactId: string) => boolean;
  canEdit: (db: D, contactId: string) => boolean;
  nextId: (db: D, p: string) => string;
}
type Undo = { __id?: string; __prev?: Record<string, unknown>; __v?: number };
type Items = { product_id?: string | null; name: string; qty: number }[];

export function opportunityHandlers<D>(c: OppCtx<D>) {
  const get = (db: D, id: string) => {
    const o = findOpp(c.store(db), id);
    if (!o || !c.visible(db, o.contact_id)) throw err(404, 'NOT_FOUND', { opportunity_id: 'not_found' });
    return o;
  };
  const writable = (db: D, id: string, ifv?: number) => {
    const o = get(db, id);
    c.writable(db, o.contact_id);
    if (o.archived) throw err(409, 'CONFLICT', { opportunity_id: 'archived' });
    check(o.version, ifv);
    return o;
  };
  const snap = (o: Opp) => ({ stage: o.stage, lost_reason: o.lost_reason, closed_at: o.closed_at, stage_changed_at: o.stage_changed_at });
  const restore = (db: D, i: { opportunity_id: string } & Undo) => {
    const o = findOpp(c.store(db), i.opportunity_id);
    if (o && i.__prev && o.version === i.__v) Object.assign(o, i.__prev, { version: o.version + 1, updated_at: now() });
  };
  const flow = (fn: (db: D, o: Opp, i: Record<string, unknown>) => Record<string, unknown>) => ({
    execute: (db: D, i: { opportunity_id: string; if_version?: number } & Record<string, unknown> & Undo) => {
      const o = writable(db, i.opportunity_id, i.if_version);
      const before = snap(o);
      const v0 = o.version;
      const out = fn(db, o, i);
      if (o.version !== v0) Object.assign(i, { __prev: before, __v: o.version });
      return { opportunity_id: o.id, version: o.version, stage: o.stage, ...out };
    },
    undo: restore,
    preview: (db: D, i: { opportunity_id: string; stage?: OpportunityStage }) => {
      const o = get(db, i.opportunity_id);
      return { summary: o.title, changes: i.stage ? [{ entity: 'contact_opportunity', id: o.id, op: 'update' as const, before: { stage: o.stage, probability: OPPORTUNITY_PROBABILITY[o.stage] }, after: { stage: i.stage, probability: OPPORTUNITY_PROBABILITY[i.stage] } }] : [] };
    },
  });
  return {
    'contact_opportunity.create': {
      execute: (db: D, i: { contact_id: string; title: string; amount_vnd?: string | null; stage?: OpportunityStage; items?: Items; expected_close_date?: string | null; need?: string; source_conversation_id?: string } & Undo) => {
        removed(i);
        c.writable(db, i.contact_id);
        moneyGuard(c.role(db), i);
        if (i.stage === 'won' || i.stage === 'lost') throw err(422, 'VALIDATION_FAILED', { stage: 'terminal_on_create' });
        const at = now();
        const stage = i.stage ?? 'lead';
        const o: Opp = { id: c.nextId(db, 'op'), contact_id: i.contact_id, title: i.title.trim(), need: i.need ?? '', amount_vnd: i.amount_vnd ?? null, stage, expected_close_date: i.expected_close_date ?? null, owner: { id: OPP_ME, name: OPP_NAMES[OPP_ME]! }, source_kind: i.source_conversation_id ? 'conversation' : 'manual', lost_reason: null, items: (i.items ?? []).map((x) => ({ product_id: x.product_id ?? null, name: x.name, qty: x.qty })), closed_at: null, stage_changed_at: at, archived: false, updated_at: at, version: 1 };
        const s = c.store(db);
        s.opps.push(o);
        s.events.push({ id: `oe_${s.events.length + 1}_${o.id}`, opportunity_id: o.id, kind: 'created', from: null, to: stage, params: {}, at });
        i.__id = o.id;
        return { opportunity_id: o.id, version: 1 };
      },
      undo: (db: D, i: Undo) => {
        const o = findOpp(c.store(db), i.__id ?? '');
        if (o && o.version === 1) Object.assign(o, { archived: true, version: 2 });
      },
      preview: (_db: D, i: { title: string }) => ({ summary: i.title }),
    },
    'contact_opportunity.update': {
      execute: (db: D, i: { opportunity_id: string; if_version?: number; patch: Partial<Opp> & Record<string, unknown> } & Undo) => {
        removed(i.patch, 'patch.');
        if ('stage' in i.patch) throw err(422, 'VALIDATION_FAILED', { 'patch.stage': 'use_set_stage' });
        const o = writable(db, i.opportunity_id, i.if_version);
        moneyGuard(c.role(db), i.patch);
        const changed = Object.entries(i.patch).some(([k, val]) => JSON.stringify((o as unknown as Record<string, unknown>)[k]) !== JSON.stringify(val));
        if (!changed) return { opportunity_id: o.id, version: o.version };
        i.__prev = Object.fromEntries(Object.keys(i.patch).map((k) => [k, (o as unknown as Record<string, unknown>)[k]]));
        Object.assign(o, i.patch, { updated_at: now(), version: o.version + 1 });
        i.__v = o.version;
        return { opportunity_id: o.id, version: o.version };
      },
      undo: restore,
      preview: (_db: D, i: { patch: { title?: string } }) => ({ summary: i.patch.title ?? 'contact_opportunity.update' }),
    },
    'contact_opportunity.archive': {
      execute: (db: D, i: { opportunity_id: string; if_version?: number } & Undo) => {
        const o = get(db, i.opportunity_id);
        c.writable(db, o.contact_id);
        if (o.archived) return { opportunity_id: o.id, archived: true, version: o.version };
        check(o.version, i.if_version);
        if (liveDocs(c.store(db), o.id)) throw err(409, 'CONFLICT', { opportunity_id: 'has_live_document' });
        Object.assign(o, { archived: true, version: o.version + 1 });
        i.__v = o.version;
        return { opportunity_id: o.id, archived: true, version: o.version };
      },
      undo: (db: D, i: { opportunity_id: string } & Undo) => {
        const o = findOpp(c.store(db), i.opportunity_id);
        if (o && o.version === i.__v) Object.assign(o, { archived: false, version: o.version + 1 });
      },
      preview: (db: D, i: { opportunity_id: string }) => ({ summary: findOpp(c.store(db), i.opportunity_id)?.title ?? i.opportunity_id }),
    },
    'contact_opportunity.set_stage': flow((db, o, i) => {
      const to = i.stage as OpportunityStage;
      if (to === 'lost') throw err(422, 'VALIDATION_FAILED', { stage: 'invalid_value' });
      if (o.stage === 'lost') throw err(409, 'INVALID_TRANSITION', { stage: 'reopen_first' });
      if (to === 'won' && !liveDocs(c.store(db), o.id)) throw err(422, 'VALIDATION_FAILED', { stage: 'won_needs_document' });
      move(c.store(db), o, to, i.suggestion_id ? 'ai_applied' : 'stage');
      return {};
    }),
    'contact_opportunity.mark_lost': flow((db, o, i) => {
      const reason = i.lost_reason as string;
      if (!(OPPORTUNITY_LOST_REASONS as readonly string[]).includes(reason)) throw err(422, 'VALIDATION_FAILED', { lost_reason: 'invalid_value' });
      if (o.stage === 'lost') return { rejected_quote_ids: [] };
      const s = c.store(db);
      if (liveDocs(s, o.id)) throw err(409, 'CONFLICT', { opportunity_id: 'has_live_document' });
      const sent = s.docs.filter((x) => x.opportunity_id === o.id && x.step === 'quote' && (x.status === 'sent' || x.status === 'viewed'));
      for (const q of sent) q.status = 'rejected';
      move(s, o, 'lost', 'lost', { reason });
      o.lost_reason = reason as Opp['lost_reason'];
      return { rejected_quote_ids: sent.map((q) => q.id) };
    }),
    'contact_opportunity.reopen': flow((db, o) => {
      if (o.stage !== 'lost') throw err(409, 'INVALID_TRANSITION', { stage: o.stage });
      move(c.store(db), o, 'qualified', 'reopened');
      o.lost_reason = null;
      return {};
    }),
    'contact_opportunity.set_owner': {
      execute: (db: D, i: { opportunity_id: string; owner_user_id: string; if_version?: number } & Undo) => {
        const o = writable(db, i.opportunity_id, i.if_version);
        if (!(i.owner_user_id in OPP_NAMES)) throw err(422, 'VALIDATION_FAILED', { owner_user_id: 'not_member' });
        if (o.owner?.id === i.owner_user_id) return { opportunity_id: o.id, version: o.version };
        i.__prev = { owner: o.owner };
        Object.assign(o, { owner: { id: i.owner_user_id, name: OPP_NAMES[i.owner_user_id]! }, version: o.version + 1, updated_at: now() });
        i.__v = o.version;
        return { opportunity_id: o.id, version: o.version };
      },
      undo: restore,
    },
    'contact_opportunity.list': {
      execute: (db: D, i: { contact_id: string }) => {
        if (!c.visible(db, i.contact_id)) throw err(404, 'NOT_FOUND', { contact_id: 'not_found' });
        return { items: oppList(c.store(db), i.contact_id).map((o) => itemDto(o, c.role(db))), next_cursor: null };
      },
    },
    'contact_opportunity.get': {
      execute: (db: D, i: { opportunity_id: string }) => {
        const o = get(db, i.opportunity_id);
        return detailDto(c.store(db), o, c.role(db), c.canEdit(db, o.contact_id));
      },
    },
  };
}

/** GET /contacts/:id/opportunities · /opportunities/:id — khách không thấy → null (404). */
export function opportunityRoute<D>(path: string, c: Pick<OppCtx<D>, 'store' | 'role' | 'visible' | 'canEdit'>) {
  const list = path.match(/^\/contacts\/([^/]+)\/opportunities$/);
  if (list) return (db: D) => (c.visible(db, list[1]!) ? { data: oppList(c.store(db), list[1]!).map((o) => itemDto(o, c.role(db))), next_cursor: null } : null);
  const one = path.match(/^\/opportunities\/([^/]+)$/);
  if (!one) return null;
  return (db: D) => {
    const o = findOpp(c.store(db), one[1]!);
    return o && c.visible(db, o.contact_id) ? detailDto(c.store(db), o, c.role(db), c.canEdit(db, o.contact_id)) : null;
  };
}
