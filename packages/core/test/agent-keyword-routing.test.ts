// TIP-022b AC2 — phân luồng từ khoá: ba ứng viên cụm chồng nhau → người thắng tất định (ưu tiên → cụm dài nhất → id); khớp CỤM NGUYÊN VẸN
// (fold dấu, ranh giới); không khớp → mặc định tài khoản / hàng nhân viên; ứng viên tạm dừng / ngoài giờ bị loại; tắt = hành vi cũ.
import { describe, expect, it } from 'vitest';
import { longestMatch, normalizePhrase, routeByKeyword } from '../src/ai/reply/keyword-router';

const A = '00000000-0000-7000-8000-00000000000a';
const B = '00000000-0000-7000-8000-00000000000b';
const C = '00000000-0000-7000-8000-00000000000c';
const D = '00000000-0000-7000-8000-00000000000d';
const routing = {
  enabled: true,
  candidates: [
    { agent_id: A, priority: 10, keywords: ['giá'] },
    { agent_id: B, priority: 10, keywords: ['bảng giá dịch vụ'] },
    { agent_id: C, priority: 50, keywords: ['khiếu nại'] },
  ],
};
const all = () => true;

describe('keyword router', () => {
  it('cụm nguyên vẹn sau chuẩn hoá: không khớp giữa từ; fold dấu + hoa thường + dấu câu', () => {
    expect(longestMatch(normalizePhrase('Cho em XIN Bảng-giá dịch vụ!'), ['bảng giá dịch vụ'])).toBe('bang gia dich vu');
    expect(longestMatch(normalizePhrase('giáo trình'), ['giá'])).toBe('');
    expect(longestMatch(normalizePhrase('gia'), ['giá'])).toBe('gia');
  });

  it('ưu tiên cao thắng; cùng ưu tiên → cụm dài nhất; bằng nhau → id nhỏ (ổn định)', () => {
    expect(routeByKeyword('em muốn khiếu nại về giá', routing, null, all)).toEqual({ agentId: C, reason: 'keyword:khieu nai' });
    expect(routeByKeyword('gửi em bảng giá dịch vụ nhé', routing, null, all)).toEqual({ agentId: B, reason: 'keyword:bang gia dich vu' });
    const tie = { enabled: true, candidates: [{ agent_id: B, priority: 1, keywords: ['spa'] }, { agent_id: A, priority: 1, keywords: ['spa'] }] };
    expect(routeByKeyword('spa', tie, null, all).agentId).toBe(A);
    // Chạy lại cùng đầu vào → cùng kết quả (job trùng / khởi động lại).
    expect(routeByKeyword('bảng giá dịch vụ', routing, null, all)).toEqual(routeByKeyword('bảng giá dịch vụ', routing, null, all));
  });

  it('không khớp → mặc định tài khoản (nếu đủ điều kiện) → hàng nhân viên', () => {
    expect(routeByKeyword('xin chào', routing, D, all)).toEqual({ agentId: D, reason: 'default' });
    expect(routeByKeyword('xin chào', routing, D, (id) => id !== D)).toEqual({ agentId: null, reason: 'none' });
    expect(routeByKeyword('xin chào', routing, null, all)).toEqual({ agentId: null, reason: 'none' });
  });

  it('ứng viên tạm dừng / ngoài giờ (không đủ điều kiện) bị loại — người kế tiếp thắng', () => {
    expect(routeByKeyword('khiếu nại giá', routing, null, (id) => id !== C).agentId).toBe(A);
  });

  it('tắt phân luồng = hành vi cũ (agent mặc định), không xét từ khoá', () => {
    expect(routeByKeyword('khiếu nại', { ...routing, enabled: false }, D, all)).toEqual({ agentId: D, reason: 'default' });
    expect(routeByKeyword('khiếu nại', undefined, D, all)).toEqual({ agentId: D, reason: 'default' });
  });
});
