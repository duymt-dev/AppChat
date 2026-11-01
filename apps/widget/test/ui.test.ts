// TIP-017 AC7 — giao diện widget (jsdom) với transport giả: lịch sử + lời chào, pre-chat bắt buộc → chat, gửi (hiện ngay, lỗi →
// đánh dấu gửi lại), nhận `message.new` (bỏ trùng), ngoại tuyến, chữ vi / en.
import { beforeEach, describe, expect, it } from 'vitest';
import { pickLocale } from '../src/i18n';
import type { Ack, HelloResult, WidgetMessage, WidgetTransport } from '../src/types';
import { ChatWidget } from '../src/ui';

class FakeTransport implements WidgetTransport {
  hellos: unknown[] = [];
  sends: { client_id: string; text: string }[] = [];
  sendReply: Ack<{ id: string; at: string }> = { data: { id: 'x', at: '' } };
  helloReply: (p: Record<string, string | undefined>) => Ack<HelloResult> = () => ({ data: hello(true) });
  private msg?: (m: WidgetMessage) => void;
  private dn?: (c: string) => void;
  async hello(p: Record<string, string | undefined>) {
    this.hellos.push(p);
    return this.helloReply(p);
  }
  async send(p: { client_id: string; text: string }) {
    this.sends.push(p);
    return this.sendReply;
  }
  onMessage(fn: (m: WidgetMessage) => void) {
    this.msg = fn;
  }
  onDown(fn: (c: string) => void) {
    this.dn = fn;
  }
  push(m: WidgetMessage) {
    this.msg?.(m);
  }
  drop(code: string) {
    this.dn?.(code);
  }
}

const hello = (ready: boolean, messages: WidgetMessage[] = []): HelloResult => ({
  visitor_id: 'v1',
  visitor_token: 'tok-1',
  config: { name: 'Trợ lý Spa', greeting: 'Xin chào 👋', color: '#2563EB', prechat: { enabled: true, fields: ['name', 'phone'] } },
  ready,
  messages,
});

let t: FakeTransport;
let saved: string[];
let n: number;
const mk = (locale: 'vi' | 'en' = 'vi') => {
  const host = document.createElement('div');
  document.body.append(host);
  return new ChatWidget(host, { transport: t, locale, saveToken: (x) => saved.push(x), pageUrl: 'https://spa.vn/', newId: () => `cid-${++n}-abcdef` });
};
const q = (w: ChatWidget, id: string) => w.root.querySelector(`[data-testid="${id}"]`) as HTMLElement;
const all = (w: ChatWidget, id: string) => [...w.root.querySelectorAll(`[data-testid="${id}"]`)].map((e) => e.textContent);
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  document.body.innerHTML = '';
  t = new FakeTransport();
  saved = [];
  n = 0;
});

describe('widget', () => {
  it('hello: tiêu đề, màu, lời chào + lịch sử, lưu token', async () => {
    t.helloReply = () => ({ data: hello(true, [{ id: 'cid-0', direction: 'in', text: 'Cũ', at: '' }, { id: 'o-1', direction: 'out', text: 'Dạ', at: '' }]) });
    const w = mk();
    await w.start();
    expect(w.root.querySelector('.title')!.textContent).toBe('Trợ lý Spa');
    expect((w.root.host as HTMLElement).style.getPropertyValue('--ac')).toBe('#2563EB');
    expect(all(w, 'wg-msg-out')).toEqual(['Xin chào 👋', 'Dạ']);
    expect(all(w, 'wg-msg-in')).toEqual(['Cũ']);
    expect(saved).toEqual(['tok-1']);
    expect(q(w, 'wg-prechat')).toBeNull();
  });

  it('pre-chat: thiếu trường → báo; đủ → hello kèm thông tin → mở ô chat', async () => {
    t.helloReply = (p) => ({ data: hello(!!(p.name && p.phone)) });
    const w = mk();
    await w.start();
    const form = q(w, 'wg-prechat') as HTMLFormElement;
    expect(form).not.toBeNull();
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(form.querySelector('.err')!.textContent).toBe('Vui lòng nhập đủ thông tin');
    (q(w, 'wg-pre-name') as HTMLInputElement).value = 'Chị Mai';
    (q(w, 'wg-pre-phone') as HTMLInputElement).value = '0901234567';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(t.hellos.at(-1)).toMatchObject({ name: 'Chị Mai', phone: '0901234567', page_url: 'https://spa.vn/' });
    expect(q(w, 'wg-prechat')).toBeNull();
    expect(w.root.querySelector('.foot')!.hasAttribute('hidden')).toBe(false);
  });

  it('gửi: hiện ngay với client_id; lỗi → đánh dấu, bấm gửi lại cùng client_id; message.new trùng id bỏ qua', async () => {
    const w = mk();
    await w.start();
    const input = q(w, 'wg-input') as HTMLTextAreaElement;
    input.value = 'Cho em hỏi giá';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flush();
    expect(t.sends).toEqual([{ client_id: 'cid-1-abcdef', text: 'Cho em hỏi giá' }]);
    expect(all(w, 'wg-msg-in')).toEqual(['Cho em hỏi giá']);
    t.push({ id: 'cid-1-abcdef', direction: 'in', text: 'Cho em hỏi giá', at: '' });
    t.push({ id: 'o-9', direction: 'out', text: 'Dạ 300k ạ', at: '' });
    t.push({ id: 'o-9', direction: 'out', text: 'Dạ 300k ạ', at: '' });
    expect(all(w, 'wg-msg-in')).toHaveLength(1);
    expect(all(w, 'wg-msg-out')).toEqual(['Xin chào 👋', 'Dạ 300k ạ']);

    t.sendReply = { error: { code: 'RATE_LIMITED' } };
    input.value = 'Nhanh quá';
    (q(w, 'wg-send') as HTMLButtonElement).click();
    await flush();
    const failed = w.root.querySelector('.fail') as HTMLElement;
    expect(failed.title).toBe('Bạn gửi hơi nhanh, chờ chút nhé');
    t.sendReply = { data: { id: 'cid-2-abcdef', at: '' } };
    failed.click();
    await flush();
    expect(t.sends.at(-1)).toEqual({ client_id: 'cid-2-abcdef', text: 'Nhanh quá' });
    expect(w.root.querySelector('.fail')).toBeNull();
  });

  it('ngoại tuyến (connect_error / hello lỗi) → ẩn ô nhập, báo; tiếng Anh', async () => {
    t.helloReply = () => ({ error: { code: 'INVALID_STATE' } });
    const w = mk('en');
    await w.start();
    expect(q(w, 'wg-note').textContent).toBe('We are offline right now — please come back later');
    expect(w.root.querySelector('.foot')!.hasAttribute('hidden')).toBe(true);
    t.drop('FORBIDDEN');
    expect(all(w, 'wg-note')).toHaveLength(1);
  });

  it('chọn ngôn ngữ: data-locale > html lang > vi', () => {
    document.documentElement.lang = 'en-US';
    expect(pickLocale(null, document)).toBe('en');
    expect(pickLocale('vi', document)).toBe('vi');
    document.documentElement.lang = '';
    expect(pickLocale(undefined, document)).toBe('vi');
  });
});
