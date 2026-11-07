// TIP-037 (unit) — luật thuần của chiến dịch: biến nội dung allowlist + fallback, độ dài sau render theo kênh (Zalo 2000, chừa dòng huỷ
// nhận), email cần tiêu đề, A/B tất định 50/50, băm nội dung đổi khi đổi phần được duyệt, giờ hẹn ISO có múi giờ + tương lai, nút theo
// trạng thái, token huỷ nhận ký + hết hạn, parse gợi ý AI (cấu trúc đóng, bộ lọc hợp lệ, nội dung lạ bị loại).
import { describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { allowedActions, assertContent, contentErrors, contentHash, parseSchedule, renderContent, unknownVariables, variantOf } from '../src/marketing/services/campaign-policy';
import { readUnsubToken, unsubToken, UNSUB_TTL_MS } from '../src/marketing/services/unsubscribe-token';
import { parseSuggestions } from '../src/marketing/ai/marketing-ai.service';

const NOW = new Date('2026-06-24T02:00:00.000Z');
const WS = '0190f000-0000-7000-8000-0000000000ee';
const R = '0190f000-0000-7000-8000-0000000000a1';
const KEY = Buffer.alloc(32, 7);
const code = (fn: () => unknown) => {
  try {
    fn();
    return 'ok';
  } catch (e) {
    return `${(e as AppError).httpStatus} ${JSON.stringify((e as AppError).fields)}`;
  }
};

describe('nội dung chiến dịch', () => {
  it('biến ngoài allowlist bị chỉ ra; render thay biến hợp lệ, thiếu dữ liệu dùng fallback, biến lạ giữ nguyên', () => {
    expect(unknownVariables('Chào {ten}, mã {ma_khach} — {link} {Tên}')).toEqual(['link']);
    expect(renderContent('Chào {ten} hạng {hang}', { ten: ' Lan ', hang: null })).toBe('Chào Lan hạng ');
    expect(renderContent('Chào {ten}', {})).toBe('Chào Quý khách');
  });

  it('Zalo: tin dài quá 2000 sau khi chừa dòng huỷ nhận → 422 too_long; email thiếu tiêu đề → 422; A/B kiểm cùng luật', () => {
    expect(contentErrors('zalo', { text: 'x'.repeat(1700) }, null)).toEqual({});
    expect(contentErrors('zalo', { text: 'x'.repeat(1790) }, null)['content.text']).toMatch(/^too_long:/);
    // Mỗi biến tính độ dài xấu nhất (60) — 30 biến {ten} không lọt qua dù chuỗi gốc ngắn.
    expect(contentErrors('zalo', { text: '{ten}'.repeat(30) }, null)['content.text']).toMatch(/^too_long:/);
    expect(contentErrors('email', { text: 'ok' }, null)).toEqual({ 'content.subject': 'required' });
    expect(contentErrors('zalo', { text: 'ok' }, { text_b: '{voucher}' })).toEqual({ 'ab.text_b': 'unknown_variable:voucher' });
    expect(code(() => assertContent('zalo', { text: '  ' }, null))).toBe('422 {"content.text":"required"}');
  });

  it('A/B tất định theo (chiến dịch, khách) và xấp xỉ 50/50', () => {
    expect(variantOf('c1', 'k1')).toBe(variantOf('c1', 'k1'));
    const n = 2000;
    let b = 0;
    for (let i = 0; i < n; i++) if (variantOf('0190f000-0000-7000-8000-000000000101', `k${i}`) === 'b') b++;
    expect(b / n).toBeGreaterThan(0.45);
    expect(b / n).toBeLessThan(0.55);
  });

  it('băm phần được duyệt đổi khi đổi nội dung / tài khoản / giờ hẹn', () => {
    const base = { channel: 'zalo', content: { text: 'a' }, ab: null, accountId: 'acc1', scheduledAt: null };
    const h = contentHash(base);
    expect(contentHash({ ...base })).toBe(h);
    expect(contentHash({ ...base, content: { text: 'b' } })).not.toBe(h);
    expect(contentHash({ ...base, accountId: 'acc2' })).not.toBe(h);
    expect(contentHash({ ...base, scheduledAt: new Date('2026-07-01T02:00:00Z') })).not.toBe(h);
  });
});

describe('giờ hẹn + nút theo trạng thái', () => {
  it('giờ hẹn phải có múi giờ và sau hiện tại ≥ 1 phút', () => {
    expect(parseSchedule('2026-06-25T09:00:00+07:00', NOW).toISOString()).toBe('2026-06-25T02:00:00.000Z');
    expect(code(() => parseSchedule('2026-06-25T09:00', NOW))).toBe('422 {"scheduled_at":"iso_offset"}');
    expect(code(() => parseSchedule('2026-06-24T09:00:30+07:00', NOW))).toBe('422 {"scheduled_at":"past"}');
  });

  it('nút: nháp sửa / gửi duyệt / gửi thử / xoá; chờ duyệt duyệt / từ chối / gửi thử; đang chạy không xoá; đã xong xuất + gửi lại; hệ thống không lộ', () => {
    expect(allowedActions('draft')).toEqual(expect.arrayContaining(['campaign.submit', 'campaign.update', 'campaign.cancel', 'campaign.send_test', 'campaign.delete']));
    expect(allowedActions('pending_approval')).toEqual(expect.arrayContaining(['campaign.approve', 'campaign.reject', 'campaign.send_test']));
    expect(allowedActions('running')).not.toContain('campaign.delete');
    expect(allowedActions('completed')).toEqual(expect.arrayContaining(['campaign.recipient_export', 'campaign.resend_unread']));
    for (const s of ['approved', 'scheduled', 'running'] as const) expect(allowedActions(s).some((a) => ['campaign.start', 'campaign.schedule', 'campaign.complete'].includes(a))).toBe(false);
  });
});

describe('token huỷ nhận tin', () => {
  it('ký + hết hạn sau 180 ngày; sửa một ký tự / sai khoá / quá hạn → null', () => {
    const t = unsubToken(KEY, WS, R, NOW);
    expect(readUnsubToken(KEY, t, NOW)).toEqual({ ws: WS, recipientId: R });
    expect(readUnsubToken(KEY, t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'), NOW)).toBeNull();
    expect(readUnsubToken(Buffer.alloc(32, 8), t, NOW)).toBeNull();
    expect(readUnsubToken(KEY, t, new Date(NOW.getTime() + UNSUB_TTL_MS + 1))).toBeNull();
    expect(readUnsubToken(KEY, 'a.b.c', NOW)).toBeNull();
  });
});

describe('gợi ý AI', () => {
  const ok = { kind: 'reactivation', title: 'Khách ngủ đông', reason: 'Lâu không mua', filter: { field: 'last_order_at', op: 'older_than_days', value: 90 }, channel: 'zalo', best_time: '09:00', subject: '', body: 'Chào {ten}', cta: 'Xem' };

  it('JSON trong khối code / có chữ quanh → đọc được; bộ lọc ngoài AST / loại lạ / biến lạ → bỏ gợi ý đó', () => {
    // Mỗi gợi ý lỗi một loại khác nhau (mỗi loại chỉ giữ gợi ý hợp lệ đầu tiên) — bị loại vì lỗi, không vì trùng loại.
    const bad = [{ ...ok, kind: 'upsell', filter: { field: 'raw_sql', op: 'eq', value: '1=1' } }, { ...ok, kind: 'spam' }, { ...ok, kind: 'conversion', body: 'Chào {link}' }];
    const r = parseSuggestions('Đây là kết quả:\n```json\n' + JSON.stringify({ suggestions: [ok, ...bad] }) + '\n```');
    expect(r?.map((s) => s.kind)).toEqual(['reactivation']);
    // Hai gợi ý cùng loại → giữ cái đầu.
    expect(parseSuggestions(JSON.stringify({ suggestions: [ok, { ...ok, title: 'Khác' }] }))?.map((s) => s.title)).toEqual(['Khách ngủ đông']);
    expect(parseSuggestions('không phải json')).toBeNull();
  });

  it('kiểu số / chuỗi model đổi lẫn (order_count "0", tiền là số, subject null) → chuẩn hoá rồi mới kiểm AST (ai:live TIP-037)', () => {
    const f = { op: 'and', children: [{ field: 'order_count', op: 'lte', value: '0' }, { field: 'last_interaction_at', op: 'within_days', value: '30' }, { field: 'total_spent', op: 'gte', value: 5000000 }] };
    const r = parseSuggestions(JSON.stringify({ suggestions: [{ ...ok, kind: 'conversion', subject: null, filter: f }] }));
    expect(r?.[0]?.filter).toEqual({ op: 'and', children: [{ field: 'order_count', op: 'lte', value: 0 }, { field: 'last_interaction_at', op: 'within_days', value: 30 }, { field: 'total_spent', op: 'gte', value: '5000000' }] });
    expect(r?.[0]?.subject).toBe('');
    // Chuỗi không phải số vẫn bị loại.
    expect(parseSuggestions(JSON.stringify({ suggestions: [{ ...ok, filter: { field: 'order_count', op: 'gte', value: 'nhiều' } }] }))).toEqual([]);
  });
});
