// Seed chung cho ma trận `contract.*appendix*` (TIP-030b F3): hợp đồng cha "đã ký" dựng ở DB (luồng ký thật kiểm ở contract-appendix.test /
// contracts.test — như ma trận contract.terminate), phụ lục nháp tạo qua action, đưa phụ lục tới trạng thái cần qua action thật.
import { uuidv7 } from '@appchat/core';
import type { Matrix } from './action-matrix';

export const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
export const otpIn = (s: string | undefined) => /\b(\d{6})\b/.exec(s ?? '')?.[1];

/** Khách + hợp đồng cha đã ký (DB) → { contact, contract }. */
export async function signedParent(m: Matrix, phone: string) {
  const contact = (await m.seed('contact.create', { full_name: 'Chị Lan PL', phone, email: `pl${phone}@example.com` })).contact_id as string;
  const c = await m.seed('contract.create', { contact_id: contact, kind: 'service', title: 'Liệu trình HIFU', value: '18000000' });
  const db = await m.db();
  const f = await db.file.create({ data: { id: uuidv7(), storageKey: `matrix/${c.contract_id}.pdf`, name: 'hd.pdf', mime: 'application/pdf', size: 1n, purpose: 'document', confirmed: true } });
  await db.contract.update({ where: { id: c.contract_id }, data: { status: 'signed', signedByBusinessAt: m.h.clock.now(), signedByCustomerAt: m.h.clock.now(), signedFileId: f.id, signedSha256: 'x'.repeat(64) } });
  return { contact, contract: c.contract_id as string, code: c.code as string };
}

export async function draftAppendix(m: Matrix, contract: string, title = 'Bổ sung 2 buổi') {
  return (await m.seed('contract.create_appendix', { contract_id: contract, title, content: `Nội dung ${title}`, value_delta: '1000000', request_key: uuidv7() })) as { appendix_id: string; code: string };
}

/** Nháp → trình duyệt → Owner OTP + duyệt & ký (LibreOffice thật render trang phụ lục). */
export async function ownerSigned(m: Matrix, contract: string) {
  const a = await draftAppendix(m, contract);
  await m.seed('contract.appendix_submit', { appendix_id: a.appendix_id });
  await m.seed('contract.appendix_owner_otp', { appendix_id: a.appendix_id });
  const owner = (await m.h.platform.user.findUniqueOrThrow({ where: { id: m.h.user } })).email;
  await m.seed('contract.appendix_approve_and_sign', { appendix_id: a.appendix_id, if_version: 1, otp: otpIn(m.h.mail.last(owner)?.text)!, signature_png: PNG });
  return a;
}

/** Hội thoại Zalo của khách (gửi link / OTP qua đúng kênh đó). */
export async function zaloOf(m: Matrix, contact: string) {
  return m.conv({ channel: 'zalo_personal', contactId: contact });
}
