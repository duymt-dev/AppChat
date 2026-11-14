// TIP-012 AC2: AES-256-GCM bí mật của DN (ops §2.2) — khứ hồi, IV ngẫu nhiên, chống sửa, sai khoá, định dạng khoá env.
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, openSecrets, parseEncKey, sealSecrets } from '../src/kernel/crypto';

const key = randomBytes(32);

describe('crypto secret', () => {
  it('khứ hồi; mỗi lần IV khác → ciphertext khác; không chứa bản rõ', () => {
    const a = encryptSecret('sk_live_ABC', key);
    const b = encryptSecret('sk_live_ABC', key);
    expect(a.equals(b)).toBe(false);
    expect(a.includes(Buffer.from('sk_live_ABC'))).toBe(false);
    expect(decryptSecret(a, key)).toBe('sk_live_ABC');
    expect(openSecrets(sealSecrets({ api_key: 'k', password: 'p' }, key), key)).toEqual({ api_key: 'k', password: 'p' });
  });

  it('sửa 1 byte / sai khoá / sai version → ném', () => {
    const a = encryptSecret('x', key);
    const t = Buffer.from(a);
    t.writeUInt8(t.readUInt8(t.length - 1) ^ 1, t.length - 1);
    expect(() => decryptSecret(t, key)).toThrow();
    expect(() => decryptSecret(a, randomBytes(32))).toThrow();
    const v = Buffer.from(a);
    v[0] = 9;
    expect(() => decryptSecret(v, key)).toThrow(/phiên bản/);
  });

  it('parseEncKey: base64 / hex 32 byte; độ dài khác → lỗi', () => {
    expect(parseEncKey(key.toString('base64')).equals(key)).toBe(true);
    expect(parseEncKey(key.toString('hex')).equals(key)).toBe(true);
    expect(() => parseEncKey(randomBytes(16).toString('base64'))).toThrow(/32 byte/);
  });
});
