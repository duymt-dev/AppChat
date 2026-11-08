// Mock form sửa khách + xuất lịch sử (TIP-025b §D.3–6) cùng hợp đồng server: `GET /contacts/:id/edit-context` (trường được thấy +
// version + quyền), `contact.update` nhận `if_version` (lệch → 409 STALE_VERSION, trả version mới), `contact.get_edit_context`,
// `contact.history_export` (CSV BOM, chặn công thức). Version giữ riêng theo id (fixture không có cột version).
import { ApiRequestError, CONTACT_EDIT_FIELDS, type ContactEditContextDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import inboxFixture from '../../../../../../../fixtures/prototype-parity/inbox.json';

const versions = new Map<string, number>();
/** Version khách của mock (dùng chung contact.update + set_stage + kanban — TIP-026b). */
export const versionOf = (id: string) => versions.get(id) ?? 1;
export const bump = (id: string) => versions.set(id, versionOf(id) + 1).get(id)!;

type Row = MockDb['customers']['contacts'][number];
const find = (db: MockDb, id: string): Row => {
  const c = db.customers.contacts.find((x) => x.id === id && !(x as { deleted?: boolean }).deleted);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'contact_id' });
  return c;
};

function editContext(db: MockDb, id: string): ContactEditContextDto {
  const c = find(db, id) as Row & Record<string, unknown>;
  const values = Object.fromEntries(CONTACT_EDIT_FIELDS.map((k) => [k, (c[k] as string | undefined) ?? null]));
  return { id: c.id, code: c.code, version: versionOf(c.id), editable: true, can_transfer: true, owner_user_id: c.owner_user_id ?? null, owner_name: c.owner_name ?? null, values, custom: (c.custom as Record<string, unknown>) ?? {}, hidden_fields: [] };
}

/** /contacts/:id/edit-context. */
export const contactEditParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/contacts\/([^/]+)\/edit-context$/);
  return m ? (db) => editContext(db, m[1]!) : null;
};

const formulaSafe = (v: string) => (/[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` : v);

export const contactEditHandlers: Record<string, MockHandler> = {
  'contact.get_edit_context': { execute: (db, i: { contact_id: string }) => editContext(db, i.contact_id) },
  'contact.update': {
    execute: (db, i: { contact_id: string; if_version?: number; patch: Record<string, unknown> }) => {
      const c = find(db, i.contact_id);
      if (i.if_version !== undefined && i.if_version !== versionOf(c.id)) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'version', fields: { version: String(versionOf(c.id)) } });
      Object.assign(c, i.patch);
      return { contact_id: c.id, version: bump(c.id) };
    },
  },
  'contact.history_export': {
    execute: (db, i: { contact_id: string }) => {
      const c = find(db, i.contact_id);
      const events = inboxFixture.contacts.ct_lan.timeline;
      const CRLF = String.fromCharCode(13, 10);
      const content = ['Thời điểm (Asia/Ho_Chi_Minh),Nội dung', ...events.map((e) => [e.when, e.text].map(formulaSafe).join(','))].join(CRLF);
      return { file_name: `lich-su-${c.code}.csv`, mime: 'text/csv', rows: events.length, total: events.length, excluded: 0, content: String.fromCharCode(0xfeff) + content };
    },
  },
};

/** Test: về trạng thái đầu. */
export const resetContactEditMock = () => versions.clear();
