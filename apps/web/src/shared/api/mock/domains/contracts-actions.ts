// Ghi Hợp đồng ở mock — cùng bảng CONTRACT_FLOW với server (state-machine §1.4, COMMERCE §9): sai trạng thái → INVALID_TRANSITION 409;
// sửa chỉ ở nháp; Owner "Duyệt & ký" cần OTP email (mock: POST /contracts/:id/sign-otp, mã cố định MOCK_OWNER_OTP); gửi ký phát link
// một lần 7 ngày; gia hạn link chỉ khi còn chờ ký; gia hạn hợp đồng (renew) chỉ từ đã ký / hết hạn.
import { ApiRequestError, CONTRACT_FLOW, CONTRACT_RENEWABLE, SIGN_LINK_DAYS, assertTransition, type AppError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockPost } from '../auth-routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW, enrich as enrichQuote } from './quotes';
import { bad, deny, fileSource, findContract, logEvent, mockGuard, visible, type Contract } from './contracts';
import { assertResolved, contractDraftHandlers } from './contracts-draft';
import { contractAppendixMock } from './contracts-appendix';
import { applyAssigned, checkOwnerEcho, checkVersion } from './commerce-edit';

const DAY = 86_400_000;
/** OTP "Duyệt & ký" của mock (server gửi email tới người ký). */
export const MOCK_OWNER_OTP = '135790';

const step = (c: Contract, action: string) => {
  try {
    return assertTransition(CONTRACT_FLOW, c.status, action);
  } catch (e) {
    return deny('INVALID_TRANSITION', (e as AppError).fields?.status ?? c.status);
  }
};

const mine = (db: MockDb, id: string) => {
  const c = findContract(db, id);
  if (!visible(db, c)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return c;
};

type Fields = Partial<
  Pick<Contract, 'contact_id' | 'quote_id' | 'number' | 'kind' | 'title' | 'value' | 'signed_date' | 'start_date' | 'end_date' | 'owner_user_id' | 'file_name' | 'note'>
>;

const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương', u_khoa: 'Khoa' };

const checkDates = (start?: string | null, end?: string | null) => {
  if (start && end && end <= start) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'end_date', fields: { end_date: 'before_start' } });
};

const insert = (db: MockDb, i: Fields & { contact_id: string }, extra: Partial<Contract> = {}) => {
  checkDates(i.start_date, i.end_date);
  const n = ++db.contracts.seq;
  const contact = db.customers.contacts.find((c) => c.id === i.contact_id);
  const owner = i.owner_user_id ?? ME;
  const c: Contract = {
    id: `ctr_${n}`,
    code: `HĐ-${n}`,
    number: i.number ?? '',
    kind: i.kind ?? 'service',
    contact_id: i.contact_id,
    contact_name: contact?.full_name ?? i.contact_id,
    phone: contact?.phone ?? '',
    quote_id: i.quote_id ?? null,
    quote_code: '',
    title: i.title ?? '',
    value: i.value ?? '0',
    signed_date: i.signed_date ?? '',
    start_date: i.start_date ?? null,
    end_date: i.end_date ?? null,
    owner_user_id: owner,
    owner_name: NAMES[owner] ?? owner,
    assigned_user_id: owner,
    assigned_name: NAMES[owner] ?? owner,
    version: 1,
    status: 'draft',
    created_at: MOCK_NOW,
    sent_at: null,
    signed_by_customer_at: null,
    sign_token: null,
    sign_link_expires_at: null,
    otp_fails: 0,
    signed_sha256: null,
    renewal_of_id: null,
    terminated_reason: '',
    note: i.note ?? '',
    file_name: i.file_name ?? '',
    events: [{ type: 'created', at: MOCK_NOW, actor: NAMES[ME]! }],
    ai: { hint: '', wait: false },
    ...extra,
  };
  db.contracts.contracts.unshift(c);
  return c;
};

const move = (action: string, event: string) => ({
  execute: (db: MockDb, i: { contract_id: string }) => {
    const c = mine(db, i.contract_id);
    c.status = step(c, action);
    logEvent(c, event, NAMES[ME]!);
    return { contract_id: c.id, status: c.status };
  },
});

const drop = (db: MockDb) => {
  const c = db.contracts.contracts.shift();
  db.contracts.seq--;
  return c;
};

/** Mã OTP "Duyệt & ký" đã gửi theo hợp đồng (mock). */
const ownerOtp = new Set<string>();

export const contractsPosts: (path: string) => MockPost | undefined = (path) => {
  const m = path.match(/^\/contracts\/(ctr_[^/]+)\/sign-otp$/);
  if (!m) return undefined;
  return (db) => {
    const c = mine(db, m[1]!);
    if (db.role !== 'owner') throw new ApiRequestError(403, { code: 'FORBIDDEN', message: 'contract.sign' });
    step(c, 'contract.approve_and_sign');
    ownerOtp.add(c.id);
    return { sent_to: 'ow•••@annhien.vn', delivery_status: 'accepted' };
  };
};

/** Tin có tệp trong hội thoại mock (id tin + chỉ số) → khách của hội thoại + tệp. */
export function attachmentOf(db: MockDb, messageId: string, idx: number) {
  for (const conv of db.inbox.conversations) {
    const m = (db.inbox.messages[conv.id] ?? []).find((x) => x.id === messageId);
    if (!m) continue;
    const a = (m.attachments as { url: string; name?: string }[] | undefined)?.[idx];
    if (!a) throw bad({ attachment_idx: 'out_of_range' });
    const fileId = /[?&]mock_file=([^&]+)/.exec(a.url)?.[1];
    if (!fileId) throw bad({ attachment: 'not_stored' });
    return { contactId: (conv as { contact_id?: string | null }).contact_id ?? null, fileId, name: a.name ?? '' };
  }
  throw new ApiRequestError(404, { code: 'NOT_FOUND', message: messageId });
}

/** Phụ lục (TIP-030b F3) — contracts-appendix.ts: GET /contracts/:id/appendices · /public/appendix-sign/:token/*. */
export const appendixMock = contractAppendixMock<MockDb, Contract>({ find: findContract, visible, isOwner: (db) => db.role === 'owner' });

export const contractsHandlers: Record<string, MockHandler> = {
  ...appendixMock.handlers,
  // AI soạn hai bước (TIP-030b F2) — contracts-draft.ts.
  ...contractDraftHandlers({ insert, findContract, visible }),
  // Hợp đồng từ tệp (TIP-030b): inspect (đề xuất cố định — server đọc chữ thật), attach (chỉ nháp, CAS source_version), tạo từ tệp đính kèm.
  'contract.inspect_file': {
    execute: (_db, i: { file_id: string }) => {
      const g = mockGuard(i.file_id);
      // Mock: đề xuất cố định (server đọc chữ thật trong worker giới hạn).
      const p = (value: string, source: string) => ({ value, confidence: 0.8, source });
      return {
        file_id: i.file_id,
        name: g.name,
        type: g.type,
        pages: g.type === 'pdf' ? 2 : null,
        sha256: g.sha256,
        extraction: 'ok',
        fields: {
          title: p('HỢP ĐỒNG DỊCH VỤ', 'HỢP ĐỒNG DỊCH VỤ'),
          party_b: p('Nguyễn Văn An', 'Bên B: Nguyễn Văn An'),
          value: p('12500000', 'Giá trị hợp đồng: 12.500.000 đồng'),
          start_date: p('2026-12-01', 'Thời hạn: từ 01/12/2026 đến 30/11/2027'),
          end_date: p('2027-11-30', 'Thời hạn: từ 01/12/2026 đến 30/11/2027'),
        },
      };
    },
  },
  'contract.attach_file': {
    execute: (db, i: { contract_id: string; file_id: string; if_source_version: number }) => {
      const c = findContract(db, i.contract_id);
      if (!visible(db, c)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: c.id });
      if (c.status !== 'draft') throw new ApiRequestError(409, { code: 'INVALID_TRANSITION', message: c.status });
      const v = c.source_version ?? 1;
      if (v !== i.if_source_version) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'source_version', fields: { source_version: String(v) } });
      Object.assign(c, fileSource(i.file_id), { source_version: v + 1 });
      logEvent(c, 'source_attached', 'Trâm');
      return { contract_id: c.id, source_version: v + 1 };
    },
  },
  'contract.create': {
    execute: (db, i: Fields & { contact_id: string; source?: { type: 'template' } | { type: 'file'; file_id: string } }) => {
      if (i.quote_id) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'quote_id', fields: { quote_id: 'use_create_from_quote' } });
      const { source, ...fields } = i;
      // Nguồn tệp (TIP-030b): guard giả theo tên trước khi tạo.
      const c = insert(db, fields, source?.type === 'file' ? { ...fileSource(source.file_id), source_version: 1 } : {});
      return { contract_id: c.id, code: c.code };
    },
    undo: drop,
  },
  'contract.create_from_attachment': {
    execute: (db, i: { message_id: string; attachment_idx: number; contact_id?: string; kind?: Contract['kind']; value?: string; title?: string }) => {
      const a = attachmentOf(db, i.message_id, i.attachment_idx);
      const contactId = i.contact_id ?? a.contactId;
      if (!contactId) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'contact_id', fields: { contact_id: 'required' } });
      const c = insert(db, { contact_id: contactId, kind: i.kind ?? 'service', value: i.value ?? '0', title: i.title ?? a.name.replace(/\.(pdf|docx)$/i, '') }, { ...fileSource(a.fileId), source_version: 1, origin_message_id: i.message_id });
      c.events = [{ type: 'created_from_attachment', at: c.created_at, actor: 'Trâm' }];
      return { contract_id: c.id, code: c.code };
    },
    undo: drop,
  },
  'contract.create_from_quote': {
    execute: (db, i: { quote_id: string }) => {
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id && !x.deleted);
      if (!q) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.quote_id });
      // Một báo giá → một HĐ HOẶC một đơn (TIP-032b): đã có đơn → QUOTE_ALREADY_CONVERTED; gọi lại → HĐ cũ.
      const order = db.orders.orders.find((o) => o.quote_id === q.id && !o.deleted);
      if (order) throw new ApiRequestError(409, { code: 'QUOTE_ALREADY_CONVERTED', message: q.code, fields: { quote_id: 'has_order', code: order.code } });
      const dup = db.contracts.contracts.find((x) => x.quote_id === q.id && !x.deleted);
      if (dup) return { contract_id: dup.id, code: dup.code };
      if (q.status !== 'accepted') deny('INVALID_TRANSITION', q.status);
      const c = insert(
        db,
        { contact_id: q.contact_id, quote_id: q.id, owner_user_id: q.owner_user_id, title: q.items.map((x) => x.name).join(', '), value: enrichQuote(q).total },
        { contact_name: q.contact_name, phone: q.phone, quote_code: q.code },
      );
      c.events = [{ type: 'created_from_quote', at: MOCK_NOW, actor: q.owner_name }];
      q.converted = { kind: 'contract', id: c.id };
      return { contract_id: c.id, code: c.code };
    },
    undo: (db, i: { quote_id: string }) => {
      drop(db);
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id);
      if (q) q.converted = null;
    },
  },
  'contract.update': {
    execute: (db, i: { contract_id: string; if_version?: number; patch: Partial<Fields> & { assigned_user_id?: string | null } }) => {
      const c = mine(db, i.contract_id);
      checkVersion(c, i.if_version);
      step(c, 'contract.update');
      const { owner_user_id, assigned_user_id, ...patch } = i.patch;
      checkOwnerEcho(c, owner_user_id);
      if (i.patch.contact_id && i.patch.contact_id !== c.contact_id) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'contact_id', fields: { contact_id: 'immutable' } });
      checkDates(patch.start_date ?? c.start_date, patch.end_date ?? c.end_date);
      Object.assign(c, patch);
      applyAssigned(c, assigned_user_id, NAMES);
      return { contract_id: c.id, version: c.version };
    },
  },
  'contract.submit': {
    execute: (db: MockDb, i: { contract_id: string }) => {
      // Cổng AI soạn (TIP-030b F2): còn điều khoản gợi ý chờ Giữ / Bỏ → không trình duyệt.
      assertResolved(mine(db, i.contract_id));
      return move('contract.submit', 'submitted').execute(db, i);
    },
  },
  'contract.request_changes': move('contract.request_changes', 'changes_requested'),
  'contract.reject_internal': move('contract.reject_internal', 'rejected_internal'),
  'contract.approve_and_sign': {
    execute: (db, i: { contract_id: string; otp: string; signature_png: string }) => {
      const c = mine(db, i.contract_id);
      const to = step(c, 'contract.approve_and_sign');
      if (!ownerOtp.has(c.id) || i.otp !== MOCK_OWNER_OTP) throw new ApiRequestError(422, { code: 'OTP_INVALID', message: '4' });
      ownerOtp.delete(c.id);
      c.status = to;
      c.business_signature = i.signature_png;
      logEvent(c, 'approved_signed', 'Chủ sở hữu');
      return { contract_id: c.id, status: c.status };
    },
  },
  'contract.send_for_signature': {
    execute: (db, i: { contract_id: string; channel: string }) => {
      const c = mine(db, i.contract_id);
      step(c, 'contract.send_for_signature');
      c.sign_token = `tk_${c.id.slice(4)}_${db.contracts.seq}_${c.events.length}`;
      c.sign_link_expires_at = new Date(new Date(MOCK_NOW).getTime() + SIGN_LINK_DAYS * DAY).toISOString();
      c.sent_at = MOCK_NOW;
      c.otp_fails = 0;
      logEvent(c, 'sent', NAMES[ME]!);
      return { contract_id: c.id, sign_url: `/sign/${c.sign_token}`, expires_at: c.sign_link_expires_at };
    },
  },
  'contract.remind_signer': {
    execute: (db, i: { contract_id: string }) => {
      const c = mine(db, i.contract_id);
      step(c, 'contract.remind_signer');
      if (!c.sign_token) deny('INVALID_STATE', 'not_sent');
      logEvent(c, 'reminded', NAMES[ME]!);
      return { contract_id: c.id };
    },
  },
  'contract.extend_sign_link': {
    execute: (db, i: { contract_id: string; days?: number }) => {
      const c = mine(db, i.contract_id);
      step(c, 'contract.extend_sign_link');
      if (!c.sign_token) deny('INVALID_STATE', 'not_sent');
      const base = Math.max(new Date(c.sign_link_expires_at ?? MOCK_NOW).getTime(), new Date(MOCK_NOW).getTime());
      c.sign_link_expires_at = new Date(base + (i.days ?? SIGN_LINK_DAYS) * DAY).toISOString();
      logEvent(c, 'link_extended', NAMES[ME]!);
      return { contract_id: c.id, expires_at: c.sign_link_expires_at };
    },
  },
  'contract.terminate': {
    execute: (db, i: { contract_id: string; reason: string }) => {
      const c = mine(db, i.contract_id);
      c.status = step(c, 'contract.terminate');
      c.terminated_reason = i.reason;
      logEvent(c, 'terminated', 'Chủ sở hữu');
      return { contract_id: c.id, status: c.status };
    },
  },
  'contract.renew': {
    execute: (db, i: { contract_id: string }) => {
      const old = mine(db, i.contract_id);
      if (!CONTRACT_RENEWABLE.includes(old.status)) deny('INVALID_TRANSITION', old.status);
      const c = insert(
        db,
        { contact_id: old.contact_id, kind: old.kind, title: old.title, value: old.value, owner_user_id: old.owner_user_id, start_date: old.end_date },
        { contact_name: old.contact_name, phone: old.phone, renewal_of_id: old.id },
      );
      return { contract_id: c.id, code: c.code };
    },
    undo: drop,
  },
  'contract.delete': {
    execute: (db, i: { contract_id: string; if_version?: number }) => {
      const c = mine(db, i.contract_id);
      checkVersion(c, i.if_version);
      step(c, 'contract.delete');
      c.deleted = true;
      return { contract_id: c.id };
    },
    undo: (db, i: { contract_id: string }) => {
      const c = db.contracts.contracts.find((x) => x.id === i.contract_id);
      if (c) c.deleted = false;
    },
  },
};
