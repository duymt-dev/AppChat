// Model giả theo kịch bản (Q-001: chưa có key 9router) — test / dev / E2E chạy engine thật trên AI SDK với `MockLanguageModelV4`.
// Mỗi lượt gọi model lấy bước kế tiếp của kịch bản: chữ trả lời hoặc lời gọi tool; token giả theo độ dài để trừ credit thật.
// `AI_ENGINE=mock` (cấm production) cài `mockModelSource` làm nguồn model cho mọi mức AI.
import { MockLanguageModelV4, convertArrayToReadableStream } from 'ai/test';
import type { ModelCandidate, ModelSource } from '../gateway/types';
import { mockKbSuggestion } from './mock-kb-suggestion';

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
  /** Số kết quả tool đã có trong prompt của run (kịch bản nhiều bước tuần tự — vd mỗi dòng chọn một lời gọi). */
  toolResults: number;
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

function toolResultsOf(prompt: unknown): number {
  return ((prompt ?? []) as { role: string; content: unknown }[])
    .filter((m) => m.role === 'tool' && Array.isArray(m.content))
    .reduce((n, m) => n + (m.content as { type: string }[]).filter((x) => x.type === 'tool-result').length, 0);
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
    ...calls.flatMap((c, i) => {
      const id = `call_${n}_${i}`;
      const input = JSON.stringify(c.input ?? {});
      // `render` (GenUI): input đến theo mảnh như provider thật → engine phát `tool_input` (khung xương — TIP-023c 6a).
      const chunks = c.tool === 'render' ? (input.match(/[\s\S]{1,48}/g) ?? []).map((delta) => ({ type: 'tool-input-delta', id, delta })) : [];
      const stream = chunks.length ? [{ type: 'tool-input-start', id, toolName: c.tool }, ...chunks, { type: 'tool-input-end', id }] : [];
      return [...stream, { type: 'tool-call', toolCallId: id, toolName: c.tool, input }];
    }),
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
      const turn = typeof script === 'function' ? script({ lastUser: lastUserText(o.prompt), call, system: systemText(o.prompt), lastTool: lastToolOf(o.prompt), toolResults: toolResultsOf(o.prompt) }) : (script[call] ?? { text: '' });
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

/** Ngữ cảnh màn trong system (`- quote: <id>` / `- selection: a, b`) — chỉ những id server đã kiểm quyền (genui/context.ts). */
const ctxId = (system: string, entity: string) => new RegExp(String.raw`^- ${entity}: (\S+)$`, 'm').exec(system)?.[1];
const ctxSelection = (system: string) => /^- selection: (.+)$/m.exec(system)?.[1]?.split(', ').filter(Boolean) ?? [];
/** Trợ lý theo màn (TIP-023c AC4): "báo giá này còn hiệu lực…" → `quote.get` bản ghi đang mở → trả lời theo `valid_until` / trạng thái. */
const QUOTE_VALIDITY = /báo giá này.*hiệu lực/i;
/** "gắn thẻ VIP cho các khách đang chọn" → lần lượt mỗi dòng chọn một `contact.tag` — mỗi lời gọi một thẻ xác nhận (engine dừng ở lời
 * gọi ghi; thẻ gộp có số bản ghi chờ `contact.bulk_update` của 045b — DV-023). */
const TAG_SELECTED = /gắn thẻ (\S+) cho các khách đang chọn/i;
/** "Phân tích pipeline …" (nút Phân tích nhanh Khách hàng) → `contact.search` → `render` bảng trỏ `$ref` bước tìm. */
const PIPELINE = /^Phân tích pipeline khách hàng/;

const pipelineTree = (step: number): MockTurn => ({
  tool: 'render',
  input: {
    tree: {
      version: 1,
      root: {
        type: 'stack',
        children: [
          { type: 'stat', label: 'Khách đang theo dõi', value: { $ref: `step:${step}.total` }, format: 'number' },
          { type: 'table', columns: [{ key: 'code', label: 'Mã' }, { key: 'name', label: 'Tên' }, { key: 'stage', label: 'Giai đoạn' }, { key: 'phone', label: 'SĐT' }], rows: { $ref: `step:${step}.contacts` }, open: { entity: 'contact', id_key: 'id' } },
        ],
      },
    },
  },
});

function screenTurn({ lastUser, system, lastTool, toolResults }: MockCtx): MockTurn | null {
  const text = lastUser.trim();
  if (QUOTE_VALIDITY.test(text)) {
    if (!lastTool) {
      const id = ctxId(system, 'quote');
      return id ? { tool: 'call_action', input: { action_id: 'quote.get', input: { quote_id: id } } } : { text: 'Anh/chị mở báo giá cần xem giúp em nhé.' };
    }
    const q = lastTool.output as { code?: string; valid_until?: string | null; status?: string };
    return { text: q.valid_until ? `Báo giá ${q.code} còn hiệu lực đến ${q.valid_until} (trạng thái: ${q.status}).` : `Báo giá ${q.code} chưa gửi nên chưa tính hiệu lực (trạng thái: ${q.status}).` };
  }
  const tag = TAG_SELECTED.exec(text);
  if (tag) {
    const ids = ctxSelection(system);
    if (!ids.length) return { text: 'Anh/chị chọn khách trên bảng trước nhé.' };
    const next = ids[toolResults];
    return next ? { tool: 'call_action', input: { action_id: 'contact.tag', input: { contact_id: next, tag: tag[1]!, op: 'add' } } } : { text: `Đã xử lý ${ids.length} khách đang chọn.` };
  }
  if (PIPELINE.test(text)) {
    // Run mới: bước 0 = lượt model gọi tìm (llm), bước 1 = kết quả tìm (tool) — `$ref` trỏ step:1. `render` từ chối thì lấy bước hợp lệ
    // server báo ("valid: …").
    if (!lastTool) return { tool: 'call_action', input: { action_id: 'contact.search', input: { limit: 20 } } };
    if (lastTool.tool === 'call_action') return pipelineTree(1);
    const valid = /valid: (\d+)/.exec(JSON.stringify(lastTool.output ?? ''))?.[1];
    if (lastTool.tool === 'render' && valid && JSON.stringify(lastTool.output).includes('render rejected')) return pipelineTree(Number(valid));
    return { text: 'Pipeline khách hàng hiện tại ở bảng trên.' };
  }
  return null;
}

function assistantTurn(ctx: MockCtx): MockTurn {
  const screen = screenTurn(ctx);
  if (screen) return screen;
  const { lastUser, lastTool } = ctx;
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

/** Nháp hợp đồng (TIP-030b F2): dòng "- tên xN", ngày dd/mm/yyyy, "TIÊU ĐỀ:" / "ĐIỀU KHOẢN:" của khối YÊU CẦU → JSON ý định. */
function mockContractDraft(text: string) {
  const req = /YÊU CẦU[^\n]*\n([\s\S]*?)(?:\n\nCHỮ TRONG TỆP|$)/.exec(text)?.[1] ?? text;
  const iso = (m: RegExpMatchArray) => `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  const dates = [...req.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)].map(iso);
  const lines = [...req.matchAll(/^- (.+?) x(\d+)\s*$/gm)].map((m) => ({ text: m[1]!.trim(), qty: Number(m[2]) }));
  const suggestions = [...req.matchAll(/^ĐIỀU KHOẢN: (.+)$/gm)].map((m) => m[1]!.trim());
  return { title: /^TIÊU ĐỀ: (.+)$/m.exec(req)?.[1]?.trim() ?? '', start_date: dates[0] ?? null, end_date: dates[1] ?? null, lines, suggestions };
}

/**
 * Kịch bản mặc định của `AI_ENGINE=mock` (dev / E2E): trả lời ngắn có nhắc lại câu hỏi. Lượt agent trực kênh (system có khung
 * output JSON — prompt `agent-reply`) → trả đúng JSON, độ tin cậy 0,9; khách đòi gặp người → `needs_human`. Lượt Trợ lý → xem
 * `assistantTurn`.
 */
export const echoScript: MockScript = (ctx) => {
  const { lastUser, system, lastTool } = ctx;
  if (ASSISTANT_MARKS.some((m) => system.includes(m))) return assistantTurn(ctx);
  // Skill dịch (TIP-025 `ai.translate`, TIP-025b `ai.translate_draft`): tiền tố ngôn ngữ đích + nguyên văn.
  const xl = /^# TRANSLATE[\s\S]*Target: (vi|en|zh|ko|ja)/.exec(system);
  if (xl) return { text: `[${xl[1]!.toUpperCase()}] ${lastUser}` };
  // Nháp Hộp thư (TIP-023c REQ-C05c): không tool — chỉ chữ; viết lại = "Dạ " + nháp, soạn = câu chào theo tin khách cuối.
  if (/^# (SOẠN NHÁP TIN NHẮN|INBOX MESSAGE DRAFT)/.test(system)) {
    const draft = /BẢN NHÁP:\n([\s\S]*)$/.exec(lastUser)?.[1]?.trim() ?? '';
    return { text: /Task: rewrite|Việc: rewrite/.test(system) ? `Dạ, ${draft}` : 'Dạ em chào anh/chị, em có thể hỗ trợ gì ạ?' };
  }
  // Soạn nháp hợp đồng (TIP-030b F2): JSON ý định từ dòng "- tên xN" + ngày dd/mm/yyyy của YÊU CẦU; dòng "ĐIỀU KHOẢN: …" → gợi ý.
  if (/^# (SOẠN NHÁP HỢP ĐỒNG|CONTRACT DRAFT)/.test(system)) return { text: JSON.stringify(mockContractDraft(lastUser)) };
  // Đề xuất tri thức từ hội thoại (TIP-043): cặp KHÁCH hỏi (có "?") + câu kế tiếp của nhân viên / agent.
  if (/^# (ĐỀ XUẤT TRI THỨC TỪ HỘI THOẠI|KNOWLEDGE SUGGESTIONS FROM A CONVERSATION)/.test(system)) return { text: mockKbSuggestion(lastUser) };
  // Tóm tắt Hồ sơ khách (TIP-015b): 3–5 dòng gạch đầu của khối DỮ LIỆU nguyên văn — test kiểm tóm tắt chỉ chứa dữ liệu người xem được thấy.
  if (/^# (TÓM TẮT HỒ SƠ KHÁCH|CUSTOMER PROFILE SUMMARY)/.test(system)) {
    const bullets = lastUser.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2)).slice(0, 5);
    return { text: JSON.stringify({ bullets: bullets.length ? bullets : [lastUser.split('\n')[1] ?? ''] }) };
  }
  const echo = lastUser ? `Đã nhận: ${lastUser.slice(0, 200)}` : 'Xin chào, tôi có thể giúp gì?';
  if (!system.includes('"needs_human"')) return { text: echo };
  const qr = lastTool ? null : ASK_QR.exec(lastUser);
  if (qr) return { tool: 'invoice__send_payment_qr', input: { invoice_id: qr[1]!, channel: 'email' } };
  const human = /nhân viên|gặp người|staff|human/i.test(lastUser);
  // TIP-022b: khiếu nại → ý định `complaint` + chuyển người (consumer tạo ticket nếu agent có grant).
  if (/khiếu nại|complain/i.test(lastUser)) return { text: JSON.stringify({ reply: null, confidence: 0.5, intent: 'complaint', sentiment: 'negative', needs_human: 'Khách khiếu nại' }) };
  return { text: JSON.stringify({ reply: human ? null : `Dạ, ${echo.charAt(0).toLowerCase()}${echo.slice(1)}`, confidence: human ? 0.4 : 0.9, intent: /giá|mua|báo giá/i.test(lastUser) ? 'buy' : 'faq', sentiment: 'neutral', needs_human: human ? 'Khách muốn gặp nhân viên' : null }) };
};

export function mockModelSource(script: MockScript = echoScript): ModelSource {
  const model = mockLanguageModel(script);
  return staticModelSource([{ provider: MOCK_PROVIDER, model: MOCK_MODEL, handle: model }]);
}
