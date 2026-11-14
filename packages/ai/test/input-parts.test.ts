// TIP-023f §3.1: tin lưu chỉ tham chiếu `appchat-input`; dựng bản sao trước mỗi lời gọi (không đổi mảng gốc), ảnh → cờ vision;
// thiếu resolver → chữ "không khả dụng" (không bịa nội dung); bytes media trong phản hồi SDK bị bỏ trước khi lưu.
import { describe, expect, it } from 'vitest';
import { hydrateMessages, inputRefsOf, stripMedia, type InputResolver } from '../src/gateway/input-parts';
import type { RunMessage } from '../src/gateway/types';

const ref = (id: string) => ({ type: 'appchat-input', artifact_id: id, revision: 1 });
const msgs: RunMessage[] = [
  { role: 'user', content: [{ type: 'text', text: 'đọc giúp' }, ref('a1'), ref('a2')] },
  { role: 'assistant', content: 'ok' },
];

describe('input parts', () => {
  it('liệt kê tham chiếu theo thứ tự, chỉ ở tin user', () => {
    expect(inputRefsOf([...msgs, { role: 'assistant', content: [ref('x')] }]).map((r) => r.artifact_id)).toEqual(['a1', 'a2']);
  });

  it('dựng chữ + ảnh vào BẢN SAO; mảng gốc vẫn chỉ tham chiếu; có ảnh → vision', async () => {
    const r: InputResolver = { hydrate: async (refs) => refs.map((x) => (x.artifact_id === 'a1' ? [{ type: 'text', text: '[a1 · page 1] CANARY' }] : [{ type: 'image', image: new Uint8Array([1, 2]), mediaType: 'image/png' }])) };
    const out = await hydrateMessages(msgs, r);
    expect(out.vision).toBe(true);
    expect(out.messages[0]!.content).toEqual([{ type: 'text', text: 'đọc giúp' }, { type: 'text', text: '[a1 · page 1] CANARY' }, { type: 'image', image: new Uint8Array([1, 2]), mediaType: 'image/png' }]);
    expect(msgs[0]!.content).toEqual([{ type: 'text', text: 'đọc giúp' }, ref('a1'), ref('a2')]);
  });

  it('không resolver → chữ không khả dụng, không vision; không tham chiếu → giữ nguyên', async () => {
    const out = await hydrateMessages(msgs, null);
    expect(out.vision).toBe(false);
    expect(JSON.stringify(out.messages)).toContain('[attachment unavailable]');
    expect((await hydrateMessages([{ role: 'user', content: 'hi' }], null)).messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('stripMedia bỏ ảnh / file khỏi tin trước khi lưu', () => {
    expect(stripMedia([{ role: 'user', content: [{ type: 'image', image: 'AAAA' }, { type: 'text', text: 't' }] }])[0]!.content).toEqual([{ type: 'text', text: '[media omitted]' }, { type: 'text', text: 't' }]);
  });
});
