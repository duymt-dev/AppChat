// Mock Khách hàng (Blueprint §4.4 crm, D32): GET /contacts, /contacts/stats, /contacts/duplicates, /custom-fields, /members,
// /contacts/:id/collaborators, /contact-access-requests. Dữ liệu = prototype L2451–2984 (fixture sinh bởi tools/scripts/fixtures/gen-customers.py).
import { ApiRequestError, ROLE_DEFS } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/customers.json';
import inboxFixture from '../../../../../../../fixtures/prototype-parity/inbox.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type CustomersFixture = typeof fixture;
type Contact = CustomersFixture['contacts'][number] & { deleted?: boolean };
type Collab = { user_id: string; role: 'collaborator' | 'watcher' };
type AccessRequest = { id: string; contact_id: string; requester_user_id: string; status: 'pending' | 'approved' | 'rejected'; note?: string };

export interface CustomersState {
  contacts: Contact[];
  collaborators: Record<string, Collab[]>;
  requests: AccessRequest[];
  fields: CustomersFixture['custom_fields'];
  duplicates: CustomersFixture['duplicates']['groups'];
  seq: number;
}

/** Người dùng hiện tại của mock (shell.json me.user.id). */
export const ME = 'u_tram';

export const createCustomersState = (): CustomersState => ({
  contacts: structuredClone(fixture.contacts),
  collaborators: structuredClone(fixture.collaborators) as Record<string, Collab[]>,
  requests: [],
  fields: structuredClone(fixture.custom_fields),
  duplicates: structuredClone(fixture.duplicates.groups),
  seq: 0,
});

const memberName = (id: string) => fixture.members.find((m) => m.id === id)?.name ?? id;

/** scopeFilter(ctx,'crm'): `own` = mình phụ trách + mình là collaborator / watcher (D32). */
const visible = (db: MockDb, c: Contact) => {
  if (c.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.crm;
  if (scope === 'all') return true;
  if (scope === 'none') return false;
  return c.owner_user_id === ME || (db.customers.collaborators[c.id] ?? []).some((x) => x.user_id === ME);
};

const withAccess = (db: MockDb, c: Contact) => {
  const collabs = db.customers.collaborators[c.id] ?? [];
  const mine = collabs.find((x) => x.user_id === ME)?.role;
  return { ...c, my_access: c.owner_user_id === ME ? 'owner' : (mine ?? 'scope'), collaborator_count: collabs.length };
};

export const customersRoutes: Record<string, MockRoute> = {
  '/contacts': (db, p) => {
    const q = String(p.q ?? '').trim().toLowerCase();
    const rows = db.customers.contacts.filter(
      (c) =>
        visible(db, c) &&
        (!p.stage || p.stage === 'all' || c.stage === p.stage) &&
        (!p.owner_id || c.owner_user_id === p.owner_id) &&
        (!p.status || c.status === p.status) &&
        (!p.group || c.group === p.group) &&
        (!p.source || c.source === p.source) &&
        (!p.mine || c.owner_user_id === ME || (db.customers.collaborators[c.id] ?? []).some((x) => x.user_id === ME)) &&
        (!q || [c.full_name, c.email, c.phone, c.title].some((v) => v.toLowerCase().includes(q))),
    );
    return { data: rows.map((c) => withAccess(db, c)), next_cursor: null };
  },
  '/contacts/stats': () => ({ stats: fixture.stats, stages: fixture.stages, tag_defs: fixture.tag_defs }),
  '/contacts/duplicates': (db) => ({ summary: fixture.duplicates.summary, groups: db.customers.duplicates }),
  '/custom-fields': (db) => db.customers.fields,
  '/members': () => fixture.members,
  '/crm/ai': () => ({ runs: fixture.ai_runs, peek: fixture.peek }),
  '/contact-access-requests': (db) =>
    db.customers.requests
      .filter((r) => r.status === 'pending')
      .map((r) => ({ ...r, requester_name: memberName(r.requester_user_id), contact_name: db.customers.contacts.find((c) => c.id === r.contact_id)?.full_name })),
};

/** Hồ sơ 360° của khách trong danh sách: khung = hồ sơ mẫu ct_lan (prototype L2724 dùng chung một nội dung), ghi đè thông tin liên hệ. */
const profile360 = (c: Contact) => ({
  ...structuredClone(inboxFixture.contacts.ct_lan),
  id: c.id,
  name: c.full_name,
  initials: c.initials,
  phone: c.phone,
  email: c.email,
  role: c.title === '—' ? inboxFixture.contacts.ct_lan.role : c.title,
});

/** /contacts/:id (360, khách kh_*) · /contacts/:id/collaborators. */
export const customersParamRoute = (path: string): MockRoute | null => {
  const one = path.match(/^\/contacts\/(kh_[^/]+)$/);
  if (one) return (db) => {
    const c = db.customers.contacts.find((x) => x.id === one[1]);
    return c && visible(db, c) ? profile360(c) : null;
  };
  const m = path.match(/^\/contacts\/([^/]+)\/collaborators$/);
  if (!m) return null;
  const id = m[1]!;
  return (db) => {
    const c = db.customers.contacts.find((x) => x.id === id);
    if (!c) return null;
    const list = (db.customers.collaborators[id] ?? []).map((x) => ({ ...x, name: memberName(x.user_id) }));
    return { owner: { user_id: c.owner_user_id, name: c.owner_name }, collaborators: list };
  };
};

const contact = (db: MockDb, id: string) => {
  const c = db.customers.contacts.find((x) => x.id === id);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return c;
};

type ContactInput = { full_name: string; phone?: string; email?: string; owner_user_id?: string; [k: string]: unknown };
type Ci = { contact_id: string };
const norm = (s?: string) => (s ?? '').replace(/\D/g, '').replace(/^84/, '0');

export const customersHandlers: Record<string, MockHandler> = {
  'contact.create': {
    execute: (db, i: ContactInput) => {
      // chống giành khách (D32): trùng SĐT / email với khách đã có người phụ trách khác → CONTACT_OWNED, không trả dữ liệu khách
      const dup = db.customers.contacts.find(
        (c) => !c.deleted && ((i.phone && norm(c.phone) === norm(i.phone)) || (i.email && c.email.toLowerCase() === i.email.toLowerCase())),
      );
      if (dup && dup.owner_user_id !== ME) {
        throw new ApiRequestError(409, { code: 'CONTACT_OWNED', message: 'contact owned', fields: { contact_id: dup.id, owner_name: dup.owner_name } });
      }
      const n = 1001 + db.customers.contacts.length;
      const owner = i.owner_user_id ?? ME;
      const [first, ...rest] = i.full_name.trim().split(' ').reverse();
      const c: Contact = {
        ...structuredClone(fixture.contacts[1]!),
        id: `kh_${n}`,
        code: `KH-${n}`,
        full_name: i.full_name,
        first_name: first ?? i.full_name,
        initials: ((first?.[0] ?? '') + (rest.at(-1)?.[0] ?? '')).toUpperCase() || i.full_name[0]!.toUpperCase(),
        title: (i.title as string) || '—',
        email: i.email ?? '',
        phone: i.phone ?? '',
        zalo: (i.zalo as string) ?? '',
        city: (i.city as string) ?? '',
        district: (i.district as string) ?? '',
        stage: 'lead',
        owner_user_id: owner,
        owner_name: memberName(owner),
        tags: [],
      };
      db.customers.contacts.unshift(c);
      return { contact_id: c.id, code: c.code };
    },
    undo: (db) => {
      db.customers.contacts.shift();
    },
  },
  'contact.update': {
    execute: (db, i: Ci & { patch: Partial<Contact> & { owner_user_id?: string } }) => {
      Object.assign(contact(db, i.contact_id), i.patch);
      return { contact_id: i.contact_id };
    },
  },
  'contact.set_stage': {
    execute: (db, i: Ci & { stage: string }) => {
      contact(db, i.contact_id).stage = i.stage;
      return { stage: i.stage };
    },
  },
  'contact.tag': {
    execute: (db, i: Ci & { tag: string; op: 'add' | 'remove' }) => {
      const c = contact(db, i.contact_id);
      c.tags = i.op === 'add' ? [...new Set([...c.tags, i.tag])] : c.tags.filter((t) => t !== i.tag);
      return { tags: c.tags };
    },
    undo: (db, i: Ci & { tag: string; op: 'add' | 'remove' }) => {
      const c = contact(db, i.contact_id);
      c.tags = i.op === 'add' ? c.tags.filter((t) => t !== i.tag) : [...c.tags, i.tag];
    },
  },
  'contact.delete': {
    execute: (db, i: Ci) => {
      contact(db, i.contact_id).deleted = true;
      return { deleted: true };
    },
    undo: (db, i: Ci) => {
      contact(db, i.contact_id).deleted = false;
    },
  },
  'contact.merge': {
    preview: (_db, i: { group_ids: string[] }) => ({ summary: 'contact.merge', count: i.group_ids.length }),
    execute: (db, i: { group_ids: string[] }) => {
      db.customers.duplicates = db.customers.duplicates.filter((g) => !i.group_ids.includes(g.id));
      return { merged: i.group_ids.length };
    },
    undo: (db) => {
      db.customers.duplicates = structuredClone(fixture.duplicates.groups);
    },
  },
  'contact.add_collaborator': {
    execute: (db, i: Ci & { user_id: string; role: Collab['role'] }) => {
      const c = contact(db, i.contact_id);
      if (c.owner_user_id !== ME && !ROLE_DEFS[db.role].permissions.includes('crm.reassign')) {
        throw new ApiRequestError(403, { code: 'FORBIDDEN', message: 'owner_or_reassign' });
      }
      const list = (db.customers.collaborators[i.contact_id] ??= []);
      if (!list.some((x) => x.user_id === i.user_id) && i.user_id !== c.owner_user_id) list.push({ user_id: i.user_id, role: i.role });
      return { collaborators: list.length };
    },
    undo: (db, i: Ci & { user_id: string }) => {
      db.customers.collaborators[i.contact_id] = (db.customers.collaborators[i.contact_id] ?? []).filter((x) => x.user_id !== i.user_id);
    },
  },
  'contact.remove_collaborator': {
    execute: (db, i: Ci & { user_id: string }) => {
      const list = (db.customers.collaborators[i.contact_id] ?? []).filter((x) => x.user_id !== i.user_id);
      db.customers.collaborators[i.contact_id] = list;
      return { collaborators: list.length };
    },
  },
  'contact.transfer_owner': {
    execute: (db, i: Ci & { to_user_id: string; move: { conversations: boolean; quotes: boolean; appointments: boolean } }) => {
      const c = contact(db, i.contact_id);
      c.owner_user_id = i.to_user_id;
      c.owner_name = memberName(i.to_user_id);
      db.customers.collaborators[i.contact_id] = (db.customers.collaborators[i.contact_id] ?? []).filter((x) => x.user_id !== i.to_user_id);
      return { owner_user_id: i.to_user_id, moved: { conversations: i.move.conversations ? 1 : 0, quotes: i.move.quotes ? 1 : 0, appointments: i.move.appointments ? 1 : 0 } };
    },
  },
  'contact.request_access': {
    execute: (db, i: Ci & { note?: string }) => {
      const id = `ar_${++db.customers.seq}`;
      db.customers.requests.push({ id, contact_id: i.contact_id, requester_user_id: ME, status: 'pending', note: i.note });
      return { request_id: id, status: 'pending' };
    },
  },
  'contact.decide_access': {
    execute: (db, i: { request_id: string; decision: 'approved' | 'rejected' }) => {
      const r = db.customers.requests.find((x) => x.id === i.request_id);
      if (!r) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.request_id });
      r.status = i.decision;
      if (i.decision === 'approved') (db.customers.collaborators[r.contact_id] ??= []).push({ user_id: r.requester_user_id, role: 'collaborator' });
      return { status: r.status };
    },
  },
  'custom_field.define': {
    execute: (db, i: { label: string; type: string; options?: string; group?: string; required?: boolean }) => {
      const key = `cf_${++db.customers.seq}`;
      db.customers.fields.push({ key, label: i.label, type: i.type, options: i.options ?? '–', group: i.group ?? '—', required: !!i.required, visible: true });
      return { key };
    },
  },
  'custom_field.update': {
    execute: (db, i: { fields: { key: string; required: boolean; visible: boolean }[] }) => {
      for (const f of i.fields) Object.assign(db.customers.fields.find((x) => x.key === f.key) ?? {}, f);
      return { updated: i.fields.length };
    },
  },
};
