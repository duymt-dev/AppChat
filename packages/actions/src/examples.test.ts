// Ví dụ trong `description` là thứ model đọc để gọi tool (Trợ lý / agent — call_action). Ví dụ sai schema (thiếu trường bắt buộc, `<uuid>` /
// `…` thay id, mảng thiếu phần tử) làm model gọi sai rồi tự sửa hoặc bỏ cuộc — ai:live 015b / 036 / 043 bắt lỗi kiểu này ở lượt đầu (DC-359).
// Kiểm ở unit: mọi JSON sau "Example" phải parse và qua `input`; action mới phải có ví dụ (danh sách cũ chỉ được rút ngắn).
import { describe, expect, it } from 'vitest';
import { registry } from './index';

/** Object JSON (lồng tới 3 mức) đứng sau "Example" — gồm cả các phương án "… or {…}" nối tiếp. */
export function examplesOf(description: string): string[] {
  const at = description.search(/\bExample/);
  if (at < 0) return [];
  const obj = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;
  return [...description.slice(at).matchAll(obj)].map((m) => m[0]);
}

/** Action có input nhưng chưa có ví dụ (trước DC-359). Chỉ được xoá dòng — action mới phải có "Example: {…}". */
const NO_EXAMPLE_YET = new Set(
  `workspace.request_transfer_otp workspace.transfer_ownership contract.approve_and_sign contract.send_for_signature contract.terminate
  contract.appendix_owner_otp contract.appendix_approve_and_sign contract.appendix_send contract.appendix_public_otp contract.appendix_public_sign
  contract.appendix_public_decline order.cancel order.sync_now invoice.record_payment invoice.resolve_bank_match invoice.void payment.refund
  payment.refund_approve payment.refund_reject package.extend package.adjust_sessions bank_feed.connect bank_feed.disconnect appointment.check_in
  appointment.complete appointment.mark_no_show staff.update staff.deactivate channel.group_result ticket.set_status ticket.close ticket.reopen
  ticket.bulk_update campaign.suggest campaign.submit campaign.send_test campaign.approve campaign.reject campaign.pause campaign.resume
  campaign.cancel campaign.delete loyalty.update_config loyalty.earn loyalty.reverse loyalty.expire loyalty.review_tier kb.suggestion.propose
  assistant.resume`.split(/\s+/),
);

describe('ví dụ trong description của action', () => {
  it('mọi ví dụ là JSON hợp lệ và qua schema input', () => {
    const bad: string[] = [];
    for (const a of registry)
      for (const ex of examplesOf(a.description)) {
        let v: unknown;
        try {
          v = JSON.parse(ex);
        } catch {
          bad.push(`${a.id}: không phải JSON — ${ex.slice(0, 80)}`);
          continue;
        }
        const r = a.input.safeParse(v);
        if (!r.success) bad.push(`${a.id}: ${r.error.issues.map((i) => `${i.path.join('.') || '(gốc)'} ${i.code}`).join(', ')}`);
      }
    expect(bad).toEqual([]);
  });

  it('action mới có ví dụ; danh sách chưa có ví dụ chỉ rút ngắn', () => {
    const ids = new Set(registry.map((a) => a.id));
    const missing = registry.filter((a) => !examplesOf(a.description).length && !NO_EXAMPLE_YET.has(a.id)).map((a) => a.id);
    expect(missing).toEqual([]);
    // Action đã có ví dụ / đã bỏ → xoá khỏi danh sách.
    const stale = [...NO_EXAMPLE_YET].filter((id) => !ids.has(id) || examplesOf(registry.find((a) => a.id === id)!.description).length);
    expect(stale).toEqual([]);
  });

  it('bắt được ví dụ sai (tự kiểm)', () => {
    expect(examplesOf('Do x. Example: {"a":1} or {"b":{"c":[1]}}')).toEqual(['{"a":1}', '{"b":{"c":[1]}}']);
    expect(examplesOf('source {"type":"file"} only')).toEqual([]);
  });
});
