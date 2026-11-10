// TIP-023f §2.1 AC3: bundle parser đóng gói thật (`dist/parser.cjs`, build trước) chạy trong tiến trình con `node --permission`:
// PDF / DOCX / .eml ra phần có vị trí; mã độc trong bundle không mở mạng / ghi đĩa / sinh tiến trình; treo → timeout và cả cây bị giết;
// vượt RSS → dừng; thiếu bundle → PARSER_ISOLATION_UNAVAILABLE (không parse trong tiến trình chính).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseIsolated } from '../../../../packages/core/src/ai/assistant/input/sandbox';
import { benignDocx, pdf } from '../../../../fixtures/contracts/files/build-fixtures';

const entry = join(import.meta.dirname, '..', '..', 'dist', 'parser.cjs');
let evil: string;

/** Bundle giả thay parser: thử mạng / ghi / tiến trình con rồi báo kết quả qua `parts` (để test đọc được). */
const hostile = (body: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'appchat-parser-evil-'));
  const f = join(dir, 'parser.cjs');
  writeFileSync(f, `exports.extractInput = async () => { ${body} };`);
  return f;
};

beforeAll(() => {
  execFileSync(process.execPath, [join(import.meta.dirname, '..', '..', 'node_modules', 'tsup', 'dist', 'cli-default.js')], { cwd: join(import.meta.dirname, '..', '..'), stdio: 'ignore' });
  evil = hostile(`
    const out = {};
    try { require('node:net').connect(80, '1.1.1.1'); out.net = 'open'; } catch (e) { out.net = e.code || 'denied'; }
    try { await fetch('http://1.1.1.1'); out.fetch = 'open'; } catch (e) { out.fetch = e.code || 'denied'; }
    try { require('node:fs').writeFileSync(require('node:os').tmpdir() + '/evil.txt', 'x'); out.write = 'open'; } catch (e) { out.write = e.code; }
    try { require('node:child_process').execSync('whoami'); out.child = 'open'; } catch (e) { out.child = e.code || 'denied'; }
    out.env = Object.keys(process.env).filter((k) => /DATABASE|REDIS|KEY|SECRET|TOKEN/.test(k));
    return { kind: 'text', parts: [{ locator: { kind: 'paragraph' }, text: JSON.stringify(out) }] };
  `);
}, 180_000);

describe('parser sandbox (bundle đóng gói thật)', () => {
  it('PDF nhiều trang / DOCX / .eml → phần có vị trí thật', async () => {
    const p = await parseIsolated({ entry }, pdf({ pages: 2, text: 'CANARY SB-1' }), 'a.pdf');
    expect(p).toMatchObject({ ok: true, kind: 'pdf', parts: [{ locator: { page: 1 } }, { locator: { page: 2 } }] });
    expect(await parseIsolated({ entry }, benignDocx(['DX canary']), 'h.docx')).toMatchObject({ ok: true, kind: 'docx' });
    expect(await parseIsolated({ entry }, Buffer.from('Subject: s\r\n\r\nthân EM'), 't.eml')).toMatchObject({ ok: true, kind: 'eml' });
  });

  it('mã trong tiến trình con: mạng / fetch / ghi đĩa / tiến trình con bị chặn; không có biến môi trường bí mật', async () => {
    const r = await parseIsolated({ entry: evil }, Buffer.from('x'), 'a.txt');
    expect(r.ok).toBe(true);
    const seen = JSON.parse((r as { parts: { text: string }[] }).parts[0]!.text) as Record<string, unknown>;
    expect(seen).toMatchObject({ net: 'NETWORK_DENIED', fetch: 'NETWORK_DENIED', write: 'ERR_ACCESS_DENIED', child: 'NETWORK_DENIED', env: [] });
  });

  it('treo → timeout; vượt RSS → too_large', async () => {
    const hang = hostile('await new Promise(() => setInterval(() => {}, 1000));');
    expect(await parseIsolated({ entry: hang, limits: { timeoutMs: 1500 } }, Buffer.from('x'), 'a.txt')).toEqual({ ok: false, reason: 'timeout' });
    const hog = hostile('const a = []; for (;;) { a.push(Buffer.alloc(8 * 1024 * 1024, 1)); await new Promise((r) => setTimeout(r, 5)); }');
    expect(await parseIsolated({ entry: hog, limits: { rssBytes: 200 * 1024 * 1024, timeoutMs: 20_000 } }, Buffer.from('x'), 'a.txt')).toEqual({ ok: false, reason: 'too_large' });
  });

  it('thiếu bundle → parser_isolation_unavailable', async () => {
    expect(await parseIsolated({ entry: null }, Buffer.from('x'), 'a.txt')).toEqual({ ok: false, reason: 'parser_isolation_unavailable' });
    expect(await parseIsolated({ entry: join(tmpdir(), 'khong-co.cjs') }, Buffer.from('x'), 'a.txt')).toEqual({ ok: false, reason: 'parser_isolation_unavailable' });
  });
});
