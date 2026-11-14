// TIP-030b F3 spec 13, 16: luồng trạng thái phụ lục (Owner ký trước, sửa chỉ ở nháp, đã ký / từ chối là cuối), trang phụ lục escape mọi chữ
// người dùng nhập + ghi mã hợp đồng cha / version / giá trị điều chỉnh có dấu. Luồng ký thật (OTP, token, PDF): contract-appendix.test.
import { describe, expect, it } from 'vitest';
import { APPENDIX_FLOW, CONTRACT_STATUSES, nextState } from '@appchat/shared';
import { appendixHtml } from '../src/contracts/appendix/artifacts';

describe('APPENDIX_FLOW', () => {
  it('draft → pending_approval → pending_signature → signed; yêu cầu sửa → draft; từ chối / link hết hạn → declined', () => {
    expect(nextState(APPENDIX_FLOW, 'draft', 'contract.appendix_submit')).toBe('pending_approval');
    expect(nextState(APPENDIX_FLOW, 'pending_approval', 'contract.appendix_request_changes')).toBe('draft');
    expect(nextState(APPENDIX_FLOW, 'pending_approval', 'contract.appendix_approve_and_sign')).toBe('pending_signature');
    expect(nextState(APPENDIX_FLOW, 'pending_signature', 'contract.appendix_public_sign')).toBe('signed');
    expect(nextState(APPENDIX_FLOW, 'pending_signature', 'contract.appendix_public_decline')).toBe('declined');
    expect(nextState(APPENDIX_FLOW, 'pending_signature', 'appendix.link_expire')).toBe('declined');
  });

  it('khách không ký trước Owner; sửa chỉ ở nháp; đã ký / từ chối không đi tiếp', () => {
    expect(nextState(APPENDIX_FLOW, 'pending_approval', 'contract.appendix_public_sign')).toBeNull();
    expect(nextState(APPENDIX_FLOW, 'pending_approval', 'contract.appendix_send')).toBeNull();
    for (const s of CONTRACT_STATUSES.filter((x) => x !== 'draft')) expect(nextState(APPENDIX_FLOW, s, 'contract.appendix_update')).toBeNull();
    for (const s of ['signed', 'declined'] as const) expect(Object.keys(APPENDIX_FLOW[s])).toEqual([]);
  });
});

describe('appendixHtml', () => {
  const a = { code: 'HĐ-1001/PL-1', title: 'Bổ sung <script>alert(1)</script>', bodyHtml: 'Điều 1. <img src=x onerror=alert(1)>\nDòng 2\n\nĐiều 2. "trích"', valueDelta: -1500000n, version: 3 };
  const html = appendixHtml(a, { code: 'HĐ-1001', title: 'Liệu trình <b>HIFU</b>' }, 'vi', 'Asia/Ho_Chi_Minh');

  it('escape mọi chữ người dùng (không thẻ / thuộc tính sống)', () => {
    expect(html).not.toMatch(/<(script|img|b)[\s>]/i);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;trích&quot;');
  });

  it('mã phụ lục + hợp đồng cha + version + giá trị điều chỉnh có dấu; đoạn / xuống dòng giữ', () => {
    expect(html).toContain('HĐ-1001/PL-1');
    expect(html).toContain('HĐ-1001 — Liệu trình &lt;b&gt;HIFU&lt;/b&gt;');
    expect(html).toContain('Phiên bản 3');
    expect(html).toMatch(/Giá trị điều chỉnh: -1\.500\.000/);
    expect(html).toContain('<br>Dòng 2');
    expect(html.match(/<p>/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it('không có giá trị điều chỉnh → không dòng giá trị', () => {
    expect(appendixHtml({ ...a, valueDelta: null }, { code: 'HĐ-1', title: 't' }, 'en', 'UTC')).not.toMatch(/Value adjustment/);
  });
});
