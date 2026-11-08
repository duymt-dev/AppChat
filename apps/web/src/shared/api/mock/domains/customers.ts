// Mock Khách hàng (Blueprint §4.4 crm, D32): GET /contacts, /contacts/stats, /contacts/duplicates, /members,
// /contacts/:id/collaborators, /contact-access-requests. Dữ liệu = prototype L2451–2984 (fixture sinh bởi tools/scripts/fixtures/gen-customers.py).
// TIP-026: `tag_id` (id thẻ = `tag_<vị trí>` trong tag_defs), `sort`, /contacts/board (kanban), /contacts/import-table (bảng mẫu).
import { ApiRequestError, ROLE_DEFS, matchCustomFilter, type CustomFieldDef, type CustomValues } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/customers.json';
import inboxFixture from '../../../../../../../fixtures/prototype-parity/inbox.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { paginate } from '../paginate';
import { memoryHandlers, memoryRoute, seedMemory, type MemoryStore } from './contact-memory';
import { bump, versionOf } from './contact-edit';
import { activityHandlers, activityRoute, activitySummary, seedActivities, type ActivityStore } from './contact-activities';

export type CustomersFixture = typeof fixture;
type Contact = CustomersFixture['contacts'][number] & { deleted?: boolean };
type Collab = { user_id: string; role: 'collaborator' | 'watcher' };
type AccessRequest = { id: string; contact_id: string; requester_user_id: string; status: 'pending' | 'approved' | 'rejected'; note?: string };

export interface CustomersState {
  contacts: Contact[];
  collaborators: Record<string, Collab[]>;
  requests: AccessRequest[];
  duplicates: CustomersFixture['duplicates']['groups'];
  seq: number;
  /** Trí nhớ AI theo khách (TIP-015b — domains/contact-memory). */
  memory: MemoryStore;
  /** Hoạt động CRM (TIP-026b — domains/contact-activities). */
  activities: ActivityStore;
}

/** Người dùng hiện tại của mock (shell.json me.user.id). */
export const ME = 'u_tram';

export const createCustomersState = (): CustomersState => ({
  contacts: structuredClone(fixture.contacts),
  collaborators: structuredClone(fixture.collaborators) as Record<string, Collab[]>,
  requests: [],
  duplicates: structuredClone(fixture.duplicates.groups),
  seq: 0,
  memory: seedMemory(),
  activities: seedActivities(),
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

/** Sửa được (TIP-026b): scope ghi crm + không phải watcher (watcher chỉ đọc). */
const writable = (db: MockDb, c: Contact) => {
  if (!visible(db, c)) return false;
  const ws = (ROLE_DEFS[db.role] as { writeScope?: { crm: string } }).writeScope?.crm ?? ROLE_DEFS[db.role].scope.crm;
  if (ws === 'all' || c.owner_user_id === ME) return ws !== 'none';
  return (db.customers.collaborators[c.id] ?? []).some((x) => x.user_id === ME && x.role === 'collaborator');
};
const actCtx = {
  store: (db: MockDb) => db.customers.activities,
  role: (db: MockDb) => db.role,
  visible: (db: MockDb, id: string) => {
    const c = db.customers.contacts.find((x) => x.id === id);
    return !!c && visible(db, c);
  },
  writable: (db: MockDb, id: string) => {
    const c = db.customers.contacts.find((x) => x.id === id);
    if (!c || !writable(db, c)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id, fields: { contact_id: 'not_found' } });
  },
  nextId: (db: MockDb, p: string) => `${p}_${++db.customers.seq}`,
};
/** Hồ sơ 360° + tóm tắt hoạt động thật (ô cũ note / comments / tasks / deal suy từ hoạt động — cùng withActivities server). */
export const withActivities360 = (db: MockDb, p: Record<string, unknown> & { id: string }) => {
  const c = db.customers.contacts.find((x) => x.id === p.id);
  const a = activitySummary(db.customers.activities, db.role, p.id, !!c && writable(db, c));
  return { ...p, activities: a };
};

export const TAG_DEFS = fixture.tag_defs.map((d, i) => ({ id: `tag_${i + 1}`, ...d }));
const tagLabel = (id: unknown) => TAG_DEFS.find((d) => d.id === id)?.label;

/** Lọc như backend (contacts.repo `where`). Kanban bỏ `stage`; `cf.*` của `/contacts` do withCustomFilters lọc, kanban / xuất lọc tại đây. */
const filtered = (db: MockDb, p: Record<string, unknown>, o: { stage: boolean; custom: boolean } = { stage: true, custom: false }) => {
  const q = String(p.q ?? '').trim().toLowerCase();
  const tag = p.tag_id ? (tagLabel(p.tag_id) ?? '#none') : '';
  const rows = db.customers.contacts.filter(
      (c) =>
        visible(db, c) &&
        (!o.stage || !p.stage || p.stage === 'all' || c.stage === p.stage) &&
        (!tag || c.tags.includes(tag)) &&
        (!p.owner_id || c.owner_user_id === p.owner_id) &&
        (!p.status || c.status === p.status) &&
        (!p.group || c.group === p.group) &&
        (!p.source || c.source === p.source) &&
        (!p.mine || c.owner_user_id === ME || (db.customers.collaborators[c.id] ?? []).some((x) => x.user_id === ME)) &&
        (!q || [c.full_name, c.email, c.phone, c.title].some((v) => v.toLowerCase().includes(q))),
  );
  const cf = !o.custom ? {} : Object.fromEntries(Object.entries(p).filter(([k, v]) => k.startsWith('cf.') && v).map(([k, v]) => [k.slice(3), String(v)]));
  const defs = Object.keys(cf).length ? ((db.settingsData.fields.contact ?? []) as unknown as CustomFieldDef[]) : [];
  const kept = defs.length ? rows.filter((c) => matchCustomFilter(defs, (c as { custom?: CustomValues }).custom, cf)) : rows;
  const by = p.sort === 'name' ? (a: Contact, b: Contact) => a.full_name.localeCompare(b.full_name, 'vi') : p.sort === 'created' ? (a: Contact, b: Contact) => b.code.localeCompare(a.code) : null;
  return (by ? [...kept].sort(by) : kept).map((c) => withAccess(db, c));
};

const BOARD_LIMIT = 50;
const STAGE_KEYS = ['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost'] as const;

/** `GET /contacts/board/:stage` (TIP-026b): trang tiếp một cột — cursor `stage:offset` (mock); cột / cursor khác → 400. */
function boardColumn(db: MockDb, stage: string, p: Record<string, unknown>) {
  const [ck, off] = String(p.cursor ?? `${stage}:0`).split(':');
  if (!(STAGE_KEYS as readonly string[]).includes(stage) || ck !== stage || !/^\d+$/.test(off ?? '')) throw new ApiRequestError(400, { code: 'VALIDATION_FAILED', message: 'cursor', fields: { cursor: 'invalid' } });
  const limit = Math.min(Math.max(Number(p.limit ?? BOARD_LIMIT), 1), 100);
  const col = filtered(db, p, { stage: false, custom: true }).filter((r) => r.stage === stage);
  const start = Number(off);
  return { data: col.slice(start, start + limit).map((r) => ({ ...r, version: versionOf(r.id) })), next_cursor: start + limit < col.length ? `${stage}:${start + limit}` : null };
}

export const customersRoutes: Record<string, MockRoute> = {
  '/contacts': (db, p) => paginate(filtered(db, p), p),
  '/contacts/board': (db, p) => {
    const rows = filtered(db, p, { stage: false, custom: true });
    const color = Object.fromEntries(fixture.stages.map((s) => [s.key, s.color])) as Record<string, string>;
    return {
      columns: STAGE_KEYS.filter((k) => k !== 'lost' || rows.some((r) => r.stage === 'lost')).map((key) => {
        const col = rows.filter((r) => r.stage === key);
        return { key, color: color[key] ?? '#9CA3AF', total: col.length, rows: col.slice(0, BOARD_LIMIT).map((r) => ({ ...r, version: versionOf(r.id) })), next_cursor: col.length > BOARD_LIMIT ? `${key}:${BOARD_LIMIT}` : null };
      }),
      limit: BOARD_LIMIT,
    };
  },
  // Mock không giữ nội dung tệp tải lên — bảng mẫu cố định (2 dòng, 1 dòng trùng SĐT khách ct_lan của fixture).
  '/contacts/import-table': () => ({
    columns: ['Họ và tên', 'Số điện thoại', 'Email'],
    rows: [
      ['Trần Bảo', '0938222110', 'bao@example.vn'],
      ['Nguyễn Thị Lan', '+84 909 123 456', ''],
    ],
    total: 2,
  }),
  '/contacts/stats': () => ({ stats: fixture.stats, stages: fixture.stages, tag_defs: TAG_DEFS }),
  '/contacts/duplicates': (db) => ({ summary: fixture.duplicates.summary, groups: db.customers.duplicates }),
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
  custom: (c as { custom?: CustomValues }).custom,
});

/** /contacts/:id (360, khách kh_*) · /contacts/:id/collaborators. */
export const customersParamRoute = (path: string): MockRoute | null => {
  const mem = memoryRoute(path, (db: MockDb, id) => {
    const c = db.customers.contacts.find((x) => x.id === id);
    return c && visible(db, c) ? c : null;
  });
  if (mem) return mem;
  const act = activityRoute(path, actCtx);
  if (act) return act;
  const col = path.match(/^\/contacts\/board\/([a-z]+)$/);
  if (col) return (db, p) => boardColumn(db, col[1]!, p);
  const one = path.match(/^\/contacts\/(kh_[^/]+)$/);
  if (one) return (db) => {
    const c = db.customers.contacts.find((x) => x.id === one[1]);
    return c && visible(db, c) ? withActivities360(db, profile360(c)) : null;
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
  ...(memoryHandlers((db: MockDb, id) => contact(db, id)) as Record<string, MockHandler>),
  ...(activityHandlers(actCtx) as unknown as Record<string, MockHandler>),
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
    execute: (db, i: Ci & { stage: string; if_version?: number }) => {
      const c = contact(db, i.contact_id);
      const v = versionOf(c.id);
      if (i.if_version !== undefined && i.if_version !== v) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'version', fields: { version: String(v) } });
      if (c.stage === i.stage) return { stage: c.stage, version: v };
      c.stage = i.stage;
      return { stage: i.stage, version: bump(c.id) };
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
  'contact.send_email': {
    execute: () => ({ ok: true }),
  },
  // Nhập / xuất (TIP-015): mock tạo khách như contact.create (bỏ dòng trùng), xuất CSV các khách đang thấy.
  'contact.import': {
    preview: (_db, i: { rows: unknown[] }) => ({ summary: 'contact.import', count: i.rows.length }),
    execute: (db, i: { rows: ContactInput[] }) => {
      const ids: string[] = [];
      let dup = 0;
      let owned = 0;
      for (const r of i.rows) {
        // Như backend: trùng SĐT / email với khách có sẵn → của mình = trùng, của người khác = đếm riêng (không tạo).
        const hit = db.customers.contacts.find((c) => !c.deleted && ((r.phone && norm(c.phone) === norm(r.phone)) || (r.email && c.email.toLowerCase() === r.email.toLowerCase())));
        if (hit) {
          if (hit.owner_user_id === ME) dup++;
          else owned++;
          continue;
        }
        try {
          ids.push((customersHandlers['contact.create']!.execute as (d: MockDb, x: ContactInput) => { contact_id: string })(db, r).contact_id);
        } catch {
          dup++;
        }
      }
      return { created: ids.length, duplicates: dup, owned, invalid: 0, contact_ids: ids };
    },
  },
  'contact.export': {
    execute: (db, i: Record<string, unknown> & { custom?: Record<string, string> }) => {
      const { custom, ...f } = i;
      const rows = filtered(db, { ...f, ...Object.fromEntries(Object.entries(custom ?? {}).map(([k, v]) => [`cf.${k}`, v])) }, { stage: true, custom: true });
      const CRLF = String.fromCharCode(13, 10);
      const content = ['Mã KH,Họ tên,Số điện thoại,Email', ...rows.map((c) => [c.code, c.full_name, c.phone, c.email].join(','))].join(CRLF);
      return { file_name: 'khach-hang.csv', mime: 'text/csv', rows: rows.length, content: String.fromCharCode(0xfeff) + content };
    },
  },
};
