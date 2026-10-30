// Giao diện widget (Blueprint §6 webchat, REQ-B05): nút nổi + cửa sổ chat trong Shadow DOM; pre-chat (thu tên / SĐT / email) khi
// widget bật; gửi tin (hiện ngay, đánh dấu lỗi để gửi lại), nhận `message.new`, lịch sử lúc `hello`. Không phụ thuộc framework.
import { MESSAGES, type Locale, type Messages } from './i18n';
import { CHAT_ICON, CSS } from './styles';
import type { HelloResult, PrechatField, WidgetMessage, WidgetTransport } from './types';

export interface WidgetOptions {
  transport: WidgetTransport;
  locale: Locale;
  /** Token khách web đã lưu → lưu lại token mới mỗi lần `hello`. */
  saveToken: (token: string) => void;
  pageUrl: string;
  /** Sinh `client_id` (test truyền bản cố định). */
  newId?: () => string;
}

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

export class ChatWidget {
  readonly root: ShadowRoot;
  private readonly t: Messages;
  private readonly win: HTMLElement;
  private readonly body: HTMLElement;
  private readonly foot: HTMLElement;
  private readonly input: HTMLTextAreaElement;
  private readonly sendBtn: HTMLButtonElement;
  private readonly title: HTMLElement;
  private pre?: HTMLElement;
  private hello?: HelloResult;
  private readonly seen = new Set<string>();
  private readonly newId: () => string;

  constructor(
    host: HTMLElement,
    private readonly o: WidgetOptions,
  ) {
    this.t = MESSAGES[o.locale];
    this.newId = o.newId ?? randomId;
    this.root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.append(style);

    const launcher = el('button', 'launcher', { 'aria-label': this.t.open, 'data-testid': 'wg-launcher' });
    launcher.innerHTML = CHAT_ICON;
    launcher.addEventListener('click', () => this.toggle());

    this.win = el('div', 'win', { role: 'dialog', 'data-testid': 'wg-window' });
    this.win.hidden = true;
    const head = el('div', 'head');
    this.title = el('div', 'title');
    const x = el('button', 'x', { 'aria-label': this.t.close });
    x.textContent = '✕';
    x.addEventListener('click', () => this.toggle(false));
    head.append(this.title, x);
    this.body = el('div', 'body', { 'data-testid': 'wg-body' });
    this.foot = el('div', 'foot');
    this.input = el('textarea', 'inp', { rows: '1', placeholder: this.t.placeholder, 'data-testid': 'wg-input' }) as HTMLTextAreaElement;
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void this.submit();
      }
    });
    this.sendBtn = el('button', 'send', { 'data-testid': 'wg-send' }) as HTMLButtonElement;
    this.sendBtn.textContent = this.t.send;
    this.sendBtn.addEventListener('click', () => void this.submit());
    this.foot.append(this.input, this.sendBtn);
    this.win.append(head, this.body, this.foot);
    this.root.append(this.win, launcher);

    this.note(this.t.connecting);
    o.transport.onMessage((m) => this.add(m));
    o.transport.onDown((code) => this.down(code));
  }

  /** Kết nối xong → `hello` (không kèm thông tin: lấy cấu hình + lịch sử + biết đã khai pre-chat chưa). */
  async start(): Promise<void> {
    const r = await this.o.transport.hello({ page_url: this.o.pageUrl, locale: this.o.locale });
    if ('error' in r) return this.down(r.error.code);
    this.apply(r.data);
  }

  toggle(open = this.win.hidden): void {
    this.win.hidden = !open;
    if (open) (this.pre?.querySelector('input') ?? this.input).focus();
  }

  private apply(h: HelloResult): void {
    this.hello = h;
    this.o.saveToken(h.visitor_token);
    (this.root.host as HTMLElement).style.setProperty('--ac', h.config.color);
    this.title.textContent = h.config.name;
    this.body.textContent = '';
    if (h.config.greeting) this.bubble({ id: 'greeting', direction: 'out', text: h.config.greeting, at: '' });
    for (const m of h.messages) this.add(m);
    if (h.ready) this.showChat();
    else this.showPrechat(h.config.prechat.fields);
  }

  private showChat(): void {
    this.pre?.remove();
    this.pre = undefined;
    this.foot.hidden = false;
  }

  private showPrechat(fields: PrechatField[]): void {
    this.foot.hidden = true;
    const form = el('form', 'pre', { 'data-testid': 'wg-prechat' });
    const lbl = el('div', 'lbl');
    lbl.textContent = this.t.prechatTitle;
    form.append(lbl);
    const inputs = fields.map((f) => {
      const i = el('input', '', { name: f, placeholder: this.t[f], type: f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text', 'data-testid': `wg-pre-${f}` }) as HTMLInputElement;
      form.append(i);
      return i;
    });
    const err = el('div', 'err');
    const go = el('button', 'send', { type: 'submit', 'data-testid': 'wg-pre-start' });
    go.textContent = this.t.start;
    form.append(err, go);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()]));
      if (inputs.some((i) => !i.value.trim())) return void (err.textContent = this.t.required);
      void this.o.transport.hello({ ...v, page_url: this.o.pageUrl, locale: this.o.locale }).then((r) => {
        if ('error' in r) return void (err.textContent = r.error.code === 'VALIDATION_FAILED' ? this.t.required : this.t.offline);
        if (!r.data.ready) return void (err.textContent = this.t.required);
        this.apply(r.data);
        this.input.focus();
      });
    });
    this.pre = form;
    this.win.append(form);
  }

  private async submit(): Promise<void> {
    const text = this.input.value.trim();
    if (!text || !this.hello) return;
    this.input.value = '';
    const id = this.newId();
    const b = this.bubble({ id, direction: 'in', text, at: new Date().toISOString() });
    await this.deliver(id, text, b);
  }

  private async deliver(id: string, text: string, b: HTMLElement): Promise<void> {
    b.classList.remove('fail');
    const r = await this.o.transport.send({ client_id: id, text });
    if (!('error' in r)) return;
    b.classList.add('fail');
    b.title = r.error.code === 'RATE_LIMITED' ? this.t.tooFast : this.t.failed;
    b.onclick = () => void this.deliver(id, text, b);
    if (r.error.code === 'INVALID_STATE') this.down(r.error.code);
  }

  /** Tin từ server (lịch sử / `message.new`) — bỏ trùng theo id (tin khách = client_id đã hiện sẵn). */
  private add(m: WidgetMessage): void {
    if (this.seen.has(m.id)) return;
    this.bubble(m);
  }

  private bubble(m: WidgetMessage): HTMLElement {
    this.seen.add(m.id);
    const b = el('div', `msg ${m.direction}`, { 'data-testid': m.direction === 'in' ? 'wg-msg-in' : 'wg-msg-out' });
    b.textContent = m.text;
    for (const a of m.attachments ?? []) {
      const link = el('a', '', { href: a.url, target: '_blank', rel: 'noopener' });
      link.textContent = a.name ?? a.url;
      b.append(document.createElement('br'), link);
    }
    this.body.querySelector('.note')?.remove();
    this.body.append(b);
    this.body.scrollTop = this.body.scrollHeight;
    return b;
  }

  private note(text: string): void {
    const n = el('div', 'note', { 'data-testid': 'wg-note' });
    n.textContent = text;
    this.body.append(n);
  }

  private down(code: string): void {
    this.foot.hidden = true;
    this.pre?.remove();
    this.body.querySelector('.note')?.remove();
    this.note(code === 'RATE_LIMITED' ? this.t.tooFast : this.t.offline);
  }
}

function el(tag: string, cls: string, attrs: Record<string, string> = {}): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
