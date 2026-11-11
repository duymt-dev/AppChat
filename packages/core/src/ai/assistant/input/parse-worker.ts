// Mã chạy TRONG tiến trình con parse (TIP-023f §2.1) — chuỗi nguồn JS thuần, gửi qua `-e`: chặn mạng ở tầng module (net/tls/dns/http/
// https/http2/dgram → ném) TRƯỚC khi nạp parser, đọc bytes từ stdin (giới hạn), gọi parser đã gộp (`entry` do server chỉ định), ghi
// một dòng JSON ra stdout. Định kỳ báo RSS để cha cắt khi vượt trần. Không biến môi trường bí mật, không đường dẫn từ tên tệp.
export const CHILD_SRC = String.raw`
const Module = require('node:module');
const deny = () => { throw Object.assign(new Error('network_denied'), { code: 'NETWORK_DENIED' }); };
const BLOCK = new Set(['net','node:net','tls','node:tls','dns','node:dns','dns/promises','node:dns/promises','http','node:http','https','node:https','http2','node:http2','dgram','node:dgram','child_process','node:child_process','worker_threads','node:worker_threads','inspector','node:inspector']);
const load = Module._load;
Module._load = function (req, parent, isMain) {
  if (BLOCK.has(req)) {
    const stub = new Proxy({}, { get: (_t, k) => (k === '__esModule' ? false : deny) });
    return stub;
  }
  return load.call(this, req, parent, isMain);
};
globalThis.fetch = deny;
const tick = setInterval(() => process.stderr.write('rss:' + process.memoryUsage().rss + '\n'), 100);
const chunks = []; let size = 0; const max = Number(process.argv[2]);
process.stdin.on('data', (c) => { size += c.length; if (size > max) { process.stdout.write(JSON.stringify({ error: 'too_large' }) + '\n'); process.exit(3); } chunks.push(c); });
process.stdin.on('end', async () => {
  try {
    const { extractInput } = require(process.argv[1]);
    const r = await extractInput(Buffer.concat(chunks), process.argv[3] || '');
    process.stdout.write(JSON.stringify({ kind: r.kind, parts: r.parts }) + '\n');
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: (e && e.reason) || 'corrupt' }) + '\n');
  }
  clearInterval(tick);
  process.exit(0);
});
`;
