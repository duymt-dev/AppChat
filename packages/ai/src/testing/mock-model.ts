// Model giả theo kịch bản (Q-001: chưa có key 9router) — test / dev / E2E chạy engine thật trên AI SDK với `MockLanguageModelV4`.
// Mỗi lượt gọi model lấy bước kế tiếp của kịch bản: chữ trả lời hoặc lời gọi tool; token giả theo độ dài để trừ credit thật.
// `AI_ENGINE=mock` (cấm production) cài `mockModelSource` làm nguồn model cho mọi mức AI.
import { MockLanguageModelV4, convertArrayToReadableStream } from 'ai/test';
import type { ModelCandidate, ModelSource } from '../gateway/types';

export type MockTurn =
  | { text: string; tokensIn?: number; tokensOut?: number }
  | { tool: string; input: unknown; tokensIn?: number; tokensOut?: number }
  | { tools: { tool: string; input: unknown }[]; tokensIn?: number; tokensOut?: number }
  | { error: { statusCode: number; message?: string } };

/** Kịch bản theo lượt: mảng cố định, hoặc hàm nhận lời nhắn cuối của người dùng + system (dev / E2E — trả lời theo câu hỏi). */
export type MockScript = MockTurn[] | ((ctx: MockCtx) => MockTurn);

/** Ngữ cảnh một lượt gọi model giả: tin người dùng cuối, system, và kết quả tool ngay trước (bước sau khi tool chạy). */
export interface MockCtx {
  lastUser: string;
  call: number;
  system: string;
  /** Tin cuối của prompt là kết quả tool → `{ tool, output }` của tool cuối; không thì null. */
  lastTool: { tool: string; output: unknown } | null;
}

export const MOCK_PROVIDER = 'mock';
export const MOCK_MODEL = 'mock-chat';

const usage = (i: number, o: number) => ({
  inputTokens: { total: i, noCache: i, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: o, text: o, reasoning: 0 },
});

function lastUserText(prompt: unknown): string {
  const msgs = (prompt ?? []) as { role: string; content: unknown }[];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!;
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) return (m.content as { type: string; text?: string }[]).map((p) => (p.type === 'text' ? (p.text ?? '') : '')).join('');
  }
  return '';
}

function systemText(prompt: unknown): string {
  return ((prompt ?? []) as { role: string; content: unknown }[]).filter((m) => m.role === 'system').map((m) => (typeof m.content === 'string' ? m.content : '')).join(' ');
}

function lastToolOf(prompt: unknown): MockCtx['lastTool'] {
  const msgs = (prompt ?? []) as { role: string; content: unknown }[];
  const m = msgs[msgs.length - 1];
  if (!m || m.role !== 'tool' || !Array.isArray(m.content)) return null;
  const p = (m.content as { type: string; toolName?: string; output?: { type?: string; value?: unknown } }[]).filter((x) => x.type === 'tool-result').pop();
  return p ? { tool: p.toolName ?? '', output: p.output?.value ?? p.output } : null;
}

function partsOf(t: Exclude<MockTurn, { error: unknown }>, n: number): unknown[] {
  const tin = t.tokensIn ?? 100;
  const head = [{ type: 'stream-start', warnings: [] }];
  if ('text' in t) {
    const tout = t.tokensOut ?? Math.max(1, Math.ceil(t.text.length / 4));
    return [...head, { type: 'text-start', id: `t${n}` }, { type: 'text-delta', id: `t${n}`, delta: t.text }, { type: 'text-end', id: `t${n}` }, { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: usage(tin, tout) }];
  }
  const calls = 'tool' in t ? [{ tool: t.tool, input: t.input }] : t.tools;
  return [
    ...head,
    ...calls.map((c, i) => ({ type: 'tool-call', toolCallId: `call_${n}_${i}`, toolName: c.tool, input: JSON.stringify(c.input ?? {}) })),
    { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: usage(tin, t.tokensOut ?? 20) },
  ];
}

/** Model giả: mỗi `doStream` lấy một lượt kịch bản. `calls` đếm số lượt đã gọi (test kiểm). */
export function mockLanguageModel(script: MockScript, opts: { provider?: string; model?: string } = {}) {
  let n = 0;
  const model = new MockLanguageModelV4({
    provider: opts.provider ?? MOCK_PROVIDER,
    modelId: opts.model ?? MOCK_MODEL,
    doStream: async (o) => {
      const call = n++;
      const turn = typeof script === 'function' ? script({ lastUser: lastUserText(o.prompt), call, system: systemText(o.prompt), lastTool: lastToolOf(o.prompt) }) : (script[call] ?? { text: '' });
      if ('error' in turn) throw Object.assign(new Error(turn.error.message ?? `HTTP ${turn.error.statusCode}`), { statusCode: turn.error.statusCode, isRetryable: turn.error.statusCode >= 500 || turn.error.statusCode === 429 });
      return { stream: convertArrayToReadableStream(partsOf(turn, call) as never[]) };
    },
  });
  return Object.assign(model, { get calls() { return n; } });
}

/** Nguồn model một ứng viên (test engine / dev). */
export function staticModelSource(cands: { provider: string; model: string; handle: unknown }[]): ModelSource {
  return { candidates: async () => cands as ModelCandidate[] };
}

/** Lượt Trợ lý (system mở đầu bằng `# TRỢ LÝ APPCHAT` / `# APPCHAT ASSISTANT` — prompt `assistant`): "tạo khách hàng <tên> <sđt>" → `call_action contact.create`. */
const ASSISTANT_MARKS = ['# TRỢ LÝ APPCHAT', '# APPCHAT ASSISTANT'];
const CREATE_CONTACT = /tạo (?:khách hàng|liên hệ)\s+(.+?)\s+((?:\+?84|0)\d[\d ]{7,12}\d)\s*$/i;
/** GenUI (TIP-023c): "kết nối email <địa chỉ>" → `render` form `channel.email.connect`, ô mật khẩu để trống (người dùng tự nhập). */
const CONNECT_EMAIL = /kết nối email\s+(\S+@\S+)/i;

const emailForm = (address: string): MockTurn => ({
  tool: 'render',
  input: {
    tree: {
      version: 1,
      root: {
        type: 'form',
        action_id: 'channel.email.connect',
        title: 'Kết nối email',
        submit_label: 'Kết nối',
        fields: [{ name: 'address', label: 'Email', value: address }, { name: 'fields.imap_host', label: 'Máy chủ IMAP' }, { name: 'fields.imap_port', label: 'Cổng', value: '993' }, { name: 'fields.password', label: 'Mật khẩu ứng dụng' }],
      },
    },
  },
});

function assistantTurn(lastUser: string, lastTool: MockCtx['lastTool']): MockTurn {
  if (lastTool) {
    const out = (lastTool.output ?? {}) as { cancelled?: boolean; error?: unknown };
    if (out.cancelled) return { text: 'Đã huỷ thao tác theo yêu cầu.' };
    if (out.error) return { text: 'Em chưa thực hiện được yêu cầu này. Anh/chị kiểm tra lại thông tin hoặc thử cách khác nhé.' };
    if (lastTool.tool === 'render') return { text: 'Anh/chị điền mật khẩu ứng dụng rồi bấm Kết nối nhé.' };
    return { text: lastTool.tool === 'call_action' ? 'Đã lưu khách hàng mới.' : 'Đã xong.' };
  }
  const mail = CONNECT_EMAIL.exec(lastUser.trim());
  if (mail) return emailForm(mail[1]!);
  const m = CREATE_CONTACT.exec(lastUser.trim());
  if (m) return { tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: m[1]!.trim(), phone: m[2]!.replace(/\s/g, '') } } };
  return { text: lastUser ? `Đã nhận: ${lastUser.slice(0, 200)}` : 'Xin chào, tôi có thể giúp gì?' };
}

/** Lượt agent trực kênh: khách xin "mã QR thanh toán <số>" → agent gọi `invoice.send_payment_qr` (risk send → xin duyệt — TIP-024). */
const ASK_QR = /(?:gửi|cho xin)\s+(?:mã\s+)?QR thanh toán\s+(\S+)/i;

/**
 * Kịch bản mặc định của `AI_ENGINE=mock` (dev / E2E): trả lời ngắn có nhắc lại câu hỏi. Lượt agent trực kênh (system có khung
 * output JSON — prompt `agent-reply`) → trả đúng JSON, độ tin cậy 0,9; khách đòi gặp người → `needs_human`. Lượt Trợ lý → xem
 * `assistantTurn`.
 */
export const echoScript: MockScript = ({ lastUser, system, lastTool }) => {
  if (ASSISTANT_MARKS.some((m) => system.includes(m))) return assistantTurn(lastUser, lastTool);
  // Skill dịch (TIP-025 `ai.translate`): tiền tố ngôn ngữ đích + nguyên văn.
  const xl = /^# TRANSLATE[\s\S]*Target: (vi|en)/.exec(system);
  if (xl) return { text: `[${xl[1]!.toUpperCase()}] ${lastUser}` };
  // Nháp Hộp thư (TIP-023c REQ-C05c): không tool — chỉ chữ; viết lại = "Dạ " + nháp, soạn = câu chào theo tin khách cuối.
  if (/^# (SOẠN NHÁP TIN NHẮN|INBOX MESSAGE DRAFT)/.test(system)) {
    const draft = /BẢN NHÁP:\n([\s\S]*)$/.exec(lastUser)?.[1]?.trim() ?? '';
    return { text: /Task: rewrite|Việc: rewrite/.test(system) ? `Dạ, ${draft}` : 'Dạ em chào anh/chị, em có thể hỗ trợ gì ạ?' };
  }
  const echo = lastUser ? `Đã nhận: ${lastUser.slice(0, 200)}` : 'Xin chào, tôi có thể giúp gì?';
  if (!system.includes('"needs_human"')) return { text: echo };
  const qr = lastTool ? null : ASK_QR.exec(lastUser);
  if (qr) return { tool: 'invoice__send_payment_qr', input: { invoice_id: qr[1]!, channel: 'email' } };
  const human = /nhân viên|gặp người|staff|human/i.test(lastUser);
  return { text: JSON.stringify({ reply: human ? null : `Dạ, ${echo.charAt(0).toLowerCase()}${echo.slice(1)}`, confidence: human ? 0.4 : 0.9, intent: 'faq', sentiment: 'neutral', needs_human: human ? 'Khách muốn gặp nhân viên' : null }) };
};

export function mockModelSource(script: MockScript = echoScript): ModelSource {
  const model = mockLanguageModel(script);
  return staticModelSource([{ provider: MOCK_PROVIDER, model: MOCK_MODEL, handle: model }]);
}
