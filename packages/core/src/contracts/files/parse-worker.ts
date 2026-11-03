// Trích chữ từ PDF / DOCX hợp đồng trong worker thread riêng có giới hạn bộ nhớ + thời gian (TIP-030b spec 5 "parser runs isolated with
// memory/time bounds"). Bytes đã qua guard (document-guard.ts) trước khi tới đây. Worker chạy mã nguồn JS thuần (eval) — không phụ thuộc
// đường dẫn tệp sau khi tsup gộp bundle; chỉ `require` gói npm đã cài (pdf-parse, mammoth). Hết giờ → terminate worker, trả `unavailable`.
// Chữ trích ra chỉ là DỮ LIỆU để đề xuất giá trị, không bao giờ là lệnh cho tool.
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

export const PARSE_LIMITS = { heapMb: 256, timeoutMs: 10_000, maxChars: 200_000 } as const;

export type ParsedText = { ok: true; text: string } | { ok: false; reason: 'unavailable' | 'timeout' };

// Mã chạy trong worker: nhận { type, body, main } → trả { text } hoặc { error }. `main` = đường dẫn `require` đã resolve ở luồng chính.
const WORKER_SRC = `
const { parentPort, workerData } = require('node:worker_threads');
const { createRequire } = require('node:module');
(async () => {
  const req = createRequire(workerData.main);
  const body = Buffer.from(workerData.body);
  let text = '';
  if (workerData.type === 'pdf') {
    const pdf = req('pdf-parse/lib/pdf-parse.js');
    // pdf.js 1.10 đọc cả ArrayBuffer nền của Buffer (Buffer nhỏ nằm chung pool 8KB → "Invalid PDF structure") — đưa bản sao đúng độ dài.
    text = (await pdf(new Uint8Array(body), { max: workerData.maxPages })).text;
  } else {
    const mammoth = req('mammoth');
    text = (await mammoth.extractRawText({ buffer: body })).value;
  }
  parentPort.postMessage({ text: String(text).slice(0, workerData.maxChars) });
})().catch((e) => parentPort.postMessage({ error: String(e && e.message || e).slice(0, 200) }));
`;

/** Điểm neo `require` cho worker (gói pdf-parse / mammoth của chính @appchat/core hoặc app đã gộp bundle). */
const anchor = () => createRequire(import.meta.url).resolve('mammoth');

export function parseInWorker(type: 'pdf' | 'docx', body: Buffer, limits: { heapMb: number; timeoutMs: number; maxChars: number } = PARSE_LIMITS, maxPages = 200): Promise<ParsedText> {
  return new Promise((done) => {
    const w = new Worker(WORKER_SRC, {
      eval: true,
      workerData: { type, body, main: anchor(), maxChars: limits.maxChars, maxPages },
      resourceLimits: { maxOldGenerationSizeMb: limits.heapMb, maxYoungGenerationSizeMb: 32, codeRangeSizeMb: 16 },
      stdout: true,
      stderr: true,
    });
    let settled = false;
    const finish = (r: ParsedText) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void w.terminate();
      done(r);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), limits.timeoutMs);
    w.once('message', (m: { text?: string; error?: string }) => finish(typeof m.text === 'string' ? { ok: true, text: m.text } : { ok: false, reason: 'unavailable' }));
    // Vượt giới hạn bộ nhớ (ERR_WORKER_OUT_OF_MEMORY) / lỗi parser → không đọc được, không làm sập tiến trình API.
    w.once('error', () => finish({ ok: false, reason: 'unavailable' }));
    w.once('exit', () => finish({ ok: false, reason: 'unavailable' }));
  });
}
