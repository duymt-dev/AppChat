// TIP-030c §1.2–1.4, §5.2: capability ký chỉ nhận đúng object ctx đã niêm phong (bản sao cùng hình dạng → 403), đúng action / hợp đồng /
// khoá; request_id phải là UUID, tham chiếu theo miền (token + thao tác) khác nhau; PNG chữ ký kiểm magic bytes; URL ký che token.
import { describe, expect, it } from 'vitest';
import { requireSigning, sealSigning, unsealSigning } from '../src/contracts/signing/capability';
import { requestRef } from '../src/contracts/signing/module';
import { attemptDigest, pngBytes } from '../src/contracts/signing/attempts';
import { redactSignUrl } from '../src/contracts/signing/redaction';
import type { ActionContext } from '../src/kernel/actions/action-context';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const ctx = (): ActionContext => ({ workspaceId: 'w', source: 'system', actor: { type: 'system', id: 'contract.public_sign' }, idempotencyKey: 'k', authz: {} as never });
const cap = { action: 'contract.public_sign' as const, workspaceId: 'w', contractId: 'c', signerId: 's', party: 'customer' as const, tokenId: 't', tokenHash: 'h', actorUserId: null, requestRef: 'r', contractVersion: 1, idempotencyKey: 'k', client: { ip: null, userAgent: null } };

describe('capability ký', () => {
  it('chỉ ctx đã niêm phong; bản sao / sai action / sai hợp đồng / đã gỡ → 403', () => {
    const c = ctx();
    sealSigning(c, cap);
    expect(requireSigning(c, 'contract.public_sign', 'c').signerId).toBe('s');
    expect(() => requireSigning({ ...c }, 'contract.public_sign', 'c')).toThrow(/FORBIDDEN/);
    expect(() => requireSigning(c, 'contract.public_otp', 'c')).toThrow(/FORBIDDEN/);
    expect(() => requireSigning(c, 'contract.public_sign', 'x')).toThrow(/FORBIDDEN/);
    unsealSigning(c);
    expect(() => requireSigning(c, 'contract.public_sign', 'c')).toThrow(/FORBIDDEN/);
  });

  it('request_id UUID bắt buộc; tham chiếu tách miền token / thao tác', () => {
    const id = '0193a1b2-c3d4-4e5f-8a9b-0c1d2e3f4a5b';
    expect(() => requestRef('t', 'open', 'x')).toThrow(/VALIDATION_FAILED/);
    expect(() => requestRef('t', 'open', undefined)).toThrow(/VALIDATION_FAILED/);
    expect(requestRef('t', 'open', id)).toBe(requestRef('t', 'open', id.toUpperCase()));
    expect(requestRef('t', 'open', id)).not.toBe(requestRef('t', 'otp', id));
    expect(requestRef('t', 'open', id)).not.toBe(requestRef('u', 'open', id));
  });

  it('PNG thật + giới hạn; digest đổi theo OTP / chữ ký; URL ký che token', () => {
    expect(pngBytes(PNG).subarray(0, 4).toString('hex')).toBe('89504e47');
    expect(() => pngBytes(`data:image/png;base64,${Buffer.from('GIF89a-not-png-bytes-here').toString('base64')}`)).toThrow(/VALIDATION_FAILED/);
    const key = Buffer.alloc(32, 1);
    expect(attemptDigest(key, '123456', PNG)).not.toBe(attemptDigest(key, '123457', PNG));
    expect(redactSignUrl('GET /sign/0193a1b2-c3d4-4e5f-8a9b-0c1d2e3f4a5b.AbCdEfGhIjKlMnOpQrStUvWxYz012345 200')).toBe('GET /sign/[redacted] 200');
  });
});
