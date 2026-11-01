// TIP-014 AC2 — render rich text Zalo + chia đoạn ≤ 2000, normalize tin vào (chữ / ảnh / file / sticker / nhóm + mention).
import { describe, expect, it } from 'vitest';
import { chunkText, normalizeZalo, renderChunks, toRichText, type ZaloRawMessage } from '../src';

describe('toRichText', () => {
  it('đậm / nghiêng / gạch → style trên chuỗi đã bỏ ký hiệu', () => {
    expect(toRichText('Chào **chị Lan**, giá *ưu đãi* là ~~500k~~ 400k')).toEqual({
      msg: 'Chào chị Lan, giá ưu đãi là 500k 400k',
      styles: [
        { start: 5, len: 7, st: 'b' },
        { start: 18, len: 6, st: 'i' },
        { start: 28, len: 4, st: 's' },
      ],
    });
  });

  it('lồng nhau + gạch dưới nghiêng; dấu * lẻ / snake_case giữ nguyên', () => {
    expect(toRichText('_xin **chào**_')).toEqual({ msg: 'xin chào', styles: [{ start: 0, len: 8, st: 'i' }, { start: 4, len: 4, st: 'b' }] });
    expect(toRichText('2 * 3 = 6, mã ma_kh_01')).toEqual({ msg: '2 * 3 = 6, mã ma_kh_01', styles: [] });
  });
});

describe('chunkText', () => {
  it('≤ max giữ nguyên; dài thì cắt ở xuống dòng / khoảng trắng; từ quá dài cắt cứng', () => {
    expect(chunkText('ngắn', 2000)).toEqual(['ngắn']);
    const para = `${'a '.repeat(600)}\n${'b '.repeat(600)}`;
    const parts = chunkText(para, 2000);
    expect(parts.every((p) => p.length <= 2000)).toBe(true);
    expect(parts[0]!.endsWith('a')).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ').trim()).toBe(para.replace(/\s+/g, ' ').trim());
    expect(chunkText('x'.repeat(4500), 2000).map((p) => p.length)).toEqual([2000, 2000, 500]);
  });

  it('renderChunks: style tính lại trong từng đoạn', () => {
    const parts = renderChunks(`${'z '.repeat(1100)}**đậm**`, 2000);
    expect(parts).toHaveLength(2);
    expect(parts[1]!.styles).toEqual([{ start: parts[1]!.msg.indexOf('đậm'), len: 3, st: 'b' }]);
  });
});

describe('normalizeZalo', () => {
  const base: ZaloRawMessage = { isGroup: false, isSelf: false, threadId: 'u1', msgId: '9001', uidFrom: 'u1', dName: 'Lan', ts: '1767225600000', msgType: 'webchat', content: 'Chào shop' };

  it('chữ 1-1 → text; tin của chính mình bỏ', () => {
    expect(normalizeZalo('acc', base, 'me')).toMatchObject({
      channelAccountId: 'acc', externalThreadId: 'u1', externalMsgId: '9001', isGroup: false, kind: 'text', text: 'Chào shop',
      sender: { externalId: 'u1', name: 'Lan' }, sentAt: '2026-01-01T00:00:00.000Z',
    });
    expect(normalizeZalo('acc', { ...base, isSelf: true }, 'me')).toBeNull();
  });

  it('ảnh / file / sticker / voice', () => {
    expect(normalizeZalo('acc', { ...base, msgType: 'chat.photo', content: { href: 'https://f/a.jpg', title: 'mẫu' } }, 'me')).toMatchObject({ kind: 'image', text: 'mẫu', attachments: [{ url: 'https://f/a.jpg', mime: 'image/jpeg' }] });
    expect(normalizeZalo('acc', { ...base, msgType: 'share.file', content: { href: 'https://f/bg', title: 'bao-gia.pdf', params: '{"fileSize":"2048","fileExt":"pdf"}' } }, 'me')).toMatchObject({
      kind: 'file', attachments: [{ url: 'https://f/bg', mime: 'application/pdf', name: 'bao-gia.pdf', size: 2048 }],
    });
    expect(normalizeZalo('acc', { ...base, msgType: 'chat.sticker', content: { id: 1 } }, 'me')?.kind).toBe('sticker');
    expect(normalizeZalo('acc', { ...base, msgType: 'chat.voice', content: { href: 'https://f/v.aac' } }, 'me')?.kind).toBe('audio');
  });

  it('nhóm: mentionsMe theo uid của tài khoản; loại lạ không chữ → null', () => {
    const g = { ...base, isGroup: true, threadId: 'g1', mentions: [{ uid: 'me' }] };
    expect(normalizeZalo('acc', g, 'me')).toMatchObject({ isGroup: true, externalThreadId: 'g1', mentionsMe: true });
    expect(normalizeZalo('acc', { ...g, mentions: [] }, 'me')?.mentionsMe).toBe(false);
    expect(normalizeZalo('acc', { ...base, msgType: 'chat.location.new', content: {} }, 'me')).toBeNull();
  });
});
