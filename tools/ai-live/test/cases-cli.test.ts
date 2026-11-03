// TIP-023b "Hợp đồng runner": chọn suite đúng file, 30 ca mặc định bất biến, file lỗi / ngoài repo / ca lạ → thoát ≠ 0, không rơi về mặc
// định; báo cáo giữ case_id / attempt / expected / actual / safety / model / prompt_hash / token / status.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { CasesError, DEFAULT_COUNT, DEFAULT_MIX, loadDefault, parseSuite, resolveCasesPath, selectSuite } from '../src/cases';
import { main, parseArgs, plan } from '../src/cli';
import { aggregate, renderMarkdown, summarize } from '../src/report';
import { runSuite, type Api } from '../src/runner';

const REL = 'tools/ai-live/test/.tmp';
const DIR = join(import.meta.dirname, '.tmp');
const one = (id: string) => ({ id, category: 'lookup', seed: 'live-seed', actor: { role: 'owner' }, locale: 'vi', input: 'Tìm khách', expect: { action: 'contact.search', confirm: false } });

function fixture(name: string, body: string) {
  writeFileSync(join(DIR, name), body);
  return `${REL}/${name}`;
}

async function exitOf(argv: string[]) {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const code = await main(argv);
  const out = log.mock.calls.map((c) => String(c[0])).join('\n');
  err.mockRestore();
  log.mockRestore();
  return { code, out };
}

describe('bộ mặc định', () => {
  it('đúng 30 ca, đúng phân bổ, id duy nhất', () => {
    const s = loadDefault();
    expect(s.cases).toHaveLength(DEFAULT_COUNT);
    for (const [cat, n] of Object.entries(DEFAULT_MIX)) expect([cat, s.cases.filter((c) => c.category === cat).length]).toEqual([cat, n]);
    expect(new Set(s.cases.map((c) => c.id)).size).toBe(DEFAULT_COUNT);
  });

  it('không truyền --cases → 30 id gốc + cổng 27', async () => {
    const r = await exitOf(['--dry']);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out) as { count: number; ids: string[]; gate: number };
    expect(j.count).toBe(30);
    expect(j.ids).toEqual(loadDefault().cases.map((c) => c.id));
    expect(j.gate).toBe(27);
  });
});

describe('--cases suite bổ sung', () => {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  afterAll(() => rmSync(DIR, { recursive: true, force: true }));

  it('JSON đúng → đúng id / số ca của file, không cổng', async () => {
    const p = fixture('extra.json', JSON.stringify({ suite: 'contact-memory', cases: [one('mem-a'), one('mem-b')] }));
    const r = await exitOf(['--cases', p, '--dry']);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out)).toEqual({ suite: 'contact-memory', count: 2, ids: ['mem-a', 'mem-b'], gate: null });
  });

  it('YAML đúng → nạp được; --only lọc', () => {
    const p = fixture('extra.yaml', `suite: s1\ncases:\n  - { id: y-a, category: lookup, seed: live-seed, actor: { role: owner }, locale: vi, input: "Tìm", expect: { action: contact.search, confirm: false } }\n  - { id: y-b, category: lookup, seed: live-seed, actor: { role: owner }, locale: vi, input: "Tìm", expect: { action: contact.search, confirm: false } }\n`);
    expect(selectSuite({ cases: p, only: ['y-b'] }).cases.map((c) => c.id)).toEqual(['y-b']);
    expect(plan(parseArgs(['--cases', p])).gate).toBeNull();
  });

  it.each([
    ['file rỗng', 'empty.json', ''],
    ['schema sai (ô lạ)', 'bad.json', JSON.stringify({ suite: 's', cases: [{ ...one('a'), extra: 1 }] })],
    ['không có ca', 'none.json', JSON.stringify({ suite: 's', cases: [] })],
    ['id trùng', 'dup.json', JSON.stringify({ suite: 's', cases: [one('a'), one('a')] })],
    ['YAML alias', 'alias.yaml', 'suite: s\nx: &a 1\ncases:\n  - *a\n'],
  ])('%s → thoát ≠ 0, không chạy bộ mặc định', async (_n, name, body) => {
    const r = await exitOf(['--cases', fixture(name, body), '--dry']);
    expect(r.code).not.toBe(0);
    expect(r.out).toBe('');
  });

  it('ca lạ trong --only → thoát ≠ 0', async () => {
    const p = fixture('ok.json', JSON.stringify({ suite: 's', cases: [one('a')] }));
    expect((await exitOf(['--cases', p, '--only', 'zzz', '--dry'])).code).not.toBe(0);
  });

  it('đường dẫn ngoài repo / tuyệt đối / không tồn tại / sai đuôi → lỗi', () => {
    expect(() => resolveCasesPath('../outside.json')).toThrow(CasesError);
    expect(() => resolveCasesPath(join(tmpdir(), 'x.json'))).toThrow(/repo_relative/);
    expect(() => resolveCasesPath('tools/ai-live/nope.json')).toThrow(/not_found/);
    expect(() => resolveCasesPath('tools/ai-live/src/cases.ts')).toThrow(/file_type/);
  });

  it('tham số lạ / thiếu giá trị → lỗi', () => {
    expect(() => parseArgs(['--case', 'x'])).toThrow(/unknown_arg/);
    expect(() => parseArgs(['--cases'])).toThrow(/missing_value/);
    expect(() => parseArgs(['--attempts', '9'])).toThrow(/attempts/);
  });
});

describe('runner + báo cáo', () => {
  const suite = parseSuite(JSON.stringify({ suite: 'rr', cases: [one('r-a')] }), 'json');

  it('attempt giữ đủ trường; thẻ xác nhận bị huỷ', async () => {
    const calls: string[] = [];
    const api: Api = {
      async req(method, path, body) {
        calls.push(`${method} ${path}${body && (body as { decision?: string }).decision ? `:${(body as { decision: string }).decision}` : ''}`);
        if (path === '/assistant/messages') return { status: 200, body: { data: { session_id: 's', run_id: 'run-1', events: [{ type: 'confirm', confirm_token: 'tok', action_id: 'contact.search' }] } } };
        if (path.endsWith('/trace'))
          return {
            status: 200,
            body: {
              data: {
                run_id: 'run-1',
                prompt: { version: 3, hash: 'abc123' },
                credits: 2,
                steps: [
                  { idx: 0, type: 'llm', status: 'ok', model: 'm-1', tokens_in: 100, tokens_out: 10 },
                  { idx: 1, type: 'tool', tool: 'call_action', action_id: 'contact.search', input: { q: 'x' }, outcome: 'ok', status: 'ok', tokens_in: 0, tokens_out: 0 },
                ],
              },
            },
          };
        return { status: 200, body: { data: {} } };
      },
    };
    const [a] = await runSuite(api, suite, { attempts: 1, seed: {}, writes: new Set(), allowed: new Set(['contact.search']) });
    expect(calls).toContain('POST /assistant/confirm:cancel');
    expect(Object.keys(a!).sort()).toEqual(expect.arrayContaining(['case_id', 'attempt', 'expected', 'actual', 'safety', 'model', 'prompt_hash', 'tokens', 'status']));
    expect(a).toMatchObject({ case_id: 'r-a', attempt: 1, model: 'm-1', prompt_hash: 'abc123', tokens: { in: 100, out: 10 }, run_id: 'run-1' });
    // Đọc mà có thẻ → fail (không được hỏi xác nhận cho tra cứu).
    expect(a!.status).toBe('fail');
    expect(a!.reasons).toContain('unexpected_confirm_card');
  });

  it('lỗi mạng / HTTP → error, không bao giờ pass; mỗi lần thử một attempt riêng', async () => {
    let n = 0;
    const api: Api = {
      async req() {
        n++;
        if (n === 1) throw new Error('ECONNRESET');
        return { status: 503, body: null };
      },
    };
    const xs = await runSuite(api, suite, { attempts: 2, seed: {}, writes: new Set(), allowed: new Set() });
    expect(xs.map((x) => [x.attempt, x.status])).toEqual([
      [1, 'error'],
      [2, 'error'],
    ]);
    expect(aggregate(xs)[0]!.status).toBe('error');
    const s = summarize('rr', xs, null);
    expect(s.passed).toBe(0);
    expect(renderMarkdown(s, xs, '2026-11-03')).toContain('| r-a | 2 | error |');
  });
});
