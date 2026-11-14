// Mock Cài đặt › Dữ liệu (Blueprint §2 custom_field_def, §3.4 inbox tags / canned replies): GET /settings/tags, /settings/replies,
// /settings/fields?entity. custom_field.* là nguồn duy nhất (D56) — modal "Trường mở rộng" ở Khách hàng đọc cùng dữ liệu.
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type SettingsTag = (typeof fixture.tags)[number];
export type SettingsReply = (typeof fixture.replies)[number];
export type SettingsField = (typeof fixture.fields.contact)[number];
type Entity = keyof typeof fixture.fields;

export interface SettingsDataState {
  tags: SettingsTag[];
  replies: SettingsReply[];
  fields: Record<string, SettingsField[]>;
  removed: Record<string, { at: number; item: unknown }>;
  seq: number;
}

export const createSettingsDataState = (): SettingsDataState => ({
  tags: structuredClone(fixture.tags),
  replies: structuredClone(fixture.replies),
  fields: structuredClone(fixture.fields) as Record<string, SettingsField[]>,
  removed: {},
  seq: 0,
});

const notFound = (id: string) => new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
const dup = (field: string) => new ApiRequestError(409, { code: 'CONFLICT', message: field, fields: { [field]: 'duplicate' } });
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
const now = () => new Date().toISOString();
const ME = 'Bạn';

const tag = (db: MockDb, id: string) => db.settingsData.tags.find((t) => t.id === id) ?? (() => { throw notFound(id); })();
const reply = (db: MockDb, id: string) => db.settingsData.replies.find((r) => r.id === id) ?? (() => { throw notFound(id); })();
const fieldsOf = (db: MockDb, e: string) => (db.settingsData.fields[e] ??= []);

/** Xoá có hoàn tác: giữ phần tử + vị trí để undo chèn lại. */
const removeAt = <T>(db: MockDb, list: T[], idx: number, key: string) => {
  db.settingsData.removed[key] = { at: idx, item: list[idx] };
  list.splice(idx, 1);
};
const restore = <T>(db: MockDb, list: T[], key: string) => {
  const r = db.settingsData.removed[key];
  if (r) list.splice(r.at, 0, r.item as T);
  delete db.settingsData.removed[key];
};

export const settingsDataRoutes: Record<string, MockRoute> = {
  '/settings/tags': (db, p) => {
    const q = fold(String(p.q ?? ''));
    return { data: db.settingsData.tags.filter((t) => !q || fold(t.name).includes(q)), palette: fixture.tag_palette };
  },
  '/settings/replies': (db, p) => {
    const q = fold(String(p.q ?? ''));
    return db.settingsData.replies.filter((r) => !q || fold(r.shortcut).includes(q) || fold(r.title).includes(q));
  },
  '/settings/fields': (db, p) => {
    const counts = Object.fromEntries(Object.keys(fixture.fields).map((e) => [e, fieldsOf(db, e).length]));
    return { data: fieldsOf(db, String(p.entity ?? 'contact') as Entity), counts };
  },
};

type TagIn = { name: string; color?: string; emoji?: string; description?: string };
type ReplyIn = { shortcut: string; title: string; body: string; category: string };
type FieldIn = Partial<Omit<SettingsField, 'key' | 'sys'>> & { key?: string; visible?: boolean };

export const settingsDataHandlers: Record<string, MockHandler> = {
  'tag.create': {
    execute: (db, i: TagIn) => {
      if (db.settingsData.tags.some((t) => fold(t.name) === fold(i.name))) throw dup('name');
      const id = `tg_${++db.settingsData.seq}`;
      const at = now();
      db.settingsData.tags.push({ id, name: i.name.trim(), color: i.color ?? fixture.tag_palette[0] ?? '', emoji: i.emoji ?? '', description: i.description ?? '',
        count: 0, created_by: ME, source: 'user', created_at: at, updated_by: null, updated_at: at });
      return { tag_id: id };
    },
  },
  'tag.update': {
    execute: (db, i: Partial<TagIn> & { tag_id: string }) => {
      const t = tag(db, i.tag_id);
      if (i.name && db.settingsData.tags.some((x) => x.id !== t.id && fold(x.name) === fold(i.name ?? ''))) throw dup('name');
      const { tag_id, ...rest } = i;
      Object.assign(t, rest, { updated_by: ME as string | null, updated_at: now() });
      return { tag_id };
    },
  },
  'tag.delete': {
    execute: (db, i: { tag_id: string }) => {
      tag(db, i.tag_id);
      removeAt(db, db.settingsData.tags, db.settingsData.tags.findIndex((t) => t.id === i.tag_id), i.tag_id);
      return { ok: true };
    },
    undo: (db, i: { tag_id: string }) => restore(db, db.settingsData.tags, i.tag_id),
  },
  'canned_reply.create': {
    execute: (db, i: ReplyIn) => {
      if (db.settingsData.replies.some((r) => r.shortcut === i.shortcut)) throw dup('shortcut');
      const id = `rp_${100 + ++db.settingsData.seq}`;
      db.settingsData.replies.push({ id, ...i });
      return { reply_id: id };
    },
  },
  'canned_reply.update': {
    execute: (db, i: Partial<ReplyIn> & { reply_id: string }) => {
      const r = reply(db, i.reply_id);
      if (i.shortcut && db.settingsData.replies.some((x) => x.id !== r.id && x.shortcut === i.shortcut)) throw dup('shortcut');
      const { reply_id, ...rest } = i;
      Object.assign(r, rest);
      return { reply_id };
    },
  },
  'canned_reply.delete': {
    execute: (db, i: { reply_id: string }) => {
      reply(db, i.reply_id);
      removeAt(db, db.settingsData.replies, db.settingsData.replies.findIndex((r) => r.id === i.reply_id), i.reply_id);
      return { ok: true };
    },
    undo: (db, i: { reply_id: string }) => restore(db, db.settingsData.replies, i.reply_id),
  },
  'custom_field.define': {
    execute: (db, i: FieldIn & { entity: string; label: string; type: string }) => {
      const list = fieldsOf(db, i.entity);
      if (list.some((f) => fold(f.label) === fold(i.label))) throw dup('label');
      const key = `cf_${++db.settingsData.seq}`;
      const on = { list: false, kanban: false, form: true, filter: false, detail: true, export: true };
      list.push({ key, label: i.label.trim(), type: i.type, options: i.options ?? '', required: !!i.required, ai: !!i.ai, sys: false,
        visible_in: { ...on, ...i.visible_in }, roles: i.roles ?? [], condition: i.condition ?? '' });
      return { key };
    },
  },
  'custom_field.update': {
    execute: (db, i: { entity: string; fields: FieldIn[]; order?: string[] }) => {
      const list = fieldsOf(db, i.entity);
      for (const { key, visible, ...f } of i.fields) {
        const cur = list.find((x) => x.key === key);
        if (!cur) continue;
        if (cur.sys && (f.label || f.type)) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'system field', fields: { key: 'system' } });
        Object.assign(cur, f, visible === undefined ? {} : { visible_in: { ...cur.visible_in, list: visible } });
      }
      if (i.order) list.sort((a, b) => (i.order ?? []).indexOf(a.key) - (i.order ?? []).indexOf(b.key));
      return { updated: i.fields.length || (i.order ? 1 : 0) };
    },
  },
  'custom_field.delete': {
    execute: (db, i: { entity: string; key: string }) => {
      const list = fieldsOf(db, i.entity);
      const idx = list.findIndex((f) => f.key === i.key);
      if (idx < 0) throw notFound(i.key);
      if (list[idx]?.sys) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'system field', fields: { key: 'system' } });
      removeAt(db, list, idx, `${i.entity}:${i.key}`);
      return { ok: true };
    },
    undo: (db, i: { entity: string; key: string }) => restore(db, fieldsOf(db, i.entity), `${i.entity}:${i.key}`),
  },
};
