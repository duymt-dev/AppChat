// `pnpm ai:live [--cases <repo-relative.json|yaml>] [--only id,id] [--attempts 3] [--dry]` (TIP-023b R1.4). Không chạy trong CI.
//   Env: AI_LIVE_API (mặc định http://localhost:4117/v1) · AI_LIVE_EMAIL (miền @ai-live.appchat.test) · AI_LIVE_PASSWORD ·
//        AI_LIVE_MAIL_DIR (MAIL_CONSOLE_DIR của API — chỉ cần lần đăng ký đầu).
//   `--dry`: chỉ nạp + kiểm suite, in id / số ca — không gọi API (dùng trong test và khi soạn ca).
// Thoát ≠ 0 khi suite lỗi (rỗng / schema sai / ca lạ / ngoài repo) — không bao giờ rơi về bộ mặc định.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CasesError, DEFAULT_COUNT, REPO_ROOT, selectSuite, type Suite } from './cases';
import { renderMarkdown, summarize } from './report';
import { runSuite } from './runner';

export interface CliArgs {
  cases?: string;
  only?: string[];
  attempts: number;
  dry: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { attempts: 1, dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new CasesError(`missing_value:${a}`);
      return v;
    };
    if (a === '--cases') out.cases = next();
    else if (a === '--only') out.only = next().split(',').map((x) => x.trim()).filter(Boolean);
    else if (a === '--attempts') {
      const n = Number(next());
      if (!Number.isInteger(n) || n < 1 || n > 5) throw new CasesError('attempts_1_to_5');
      out.attempts = n;
    } else if (a === '--dry') out.dry = true;
    else if (a !== '--') throw new CasesError(`unknown_arg:${a}`);
  }
  return out;
}

/** Suite + cổng: bộ mặc định đủ 30 ca → cổng 27/30; suite bổ sung / lọc `--only` → không cổng (báo cáo riêng). */
export function plan(args: CliArgs): { suite: Suite; gate: number | null } {
  const suite = selectSuite(args);
  const gate = !args.cases && !args.only?.length && suite.cases.length === DEFAULT_COUNT ? 27 : null;
  return { suite, gate };
}

async function live(args: CliArgs, suite: Suite, gate: number | null): Promise<number> {
  const env = process.env;
  const email = env.AI_LIVE_EMAIL ?? '';
  const password = env.AI_LIVE_PASSWORD ?? '';
  if (!email || !password) throw new CasesError('AI_LIVE_EMAIL / AI_LIVE_PASSWORD chưa đặt');
  // Seed fixture là .mjs dùng chung với TIP-044 — nạp động (không đưa vào typecheck của gói).
  const seedMod = (await import(join(REPO_ROOT, 'fixtures', 'ai-eval', 'live-seed.mjs'))) as {
    client(api: string, email: string): { req(m: string, p: string, b?: unknown): Promise<{ status: number; body: unknown }> };
    signIn(c: unknown, o: { email: string; password: string; mailDir?: string }): Promise<void>;
    seed(c: unknown): Promise<unknown>;
  };
  const c = seedMod.client(env.AI_LIVE_API ?? 'http://localhost:4117/v1', email);
  await seedMod.signIn(c, { email, password, ...(env.AI_LIVE_MAIL_DIR ? { mailDir: env.AI_LIVE_MAIL_DIR } : {}) });
  const seed = await seedMod.seed(c);
  const acts = (await c.req('GET', '/actions')).body as { data: { id: string; risk: string }[] };
  const writes = new Set(acts.data.filter((a) => a.risk !== 'read').map((a) => a.id));
  const allowed = new Set(acts.data.map((a) => a.id));
  const attempts = await runSuite(c, suite, { attempts: args.attempts, seed, writes, allowed, log: (l) => console.log(l) });
  const s = summarize(suite.suite, attempts, gate);
  const date = new Date().toISOString().slice(0, 10);
  const dir = join(REPO_ROOT, 'coding-packs', 'reports');
  mkdirSync(dir, { recursive: true });
  const name = `ai-live-${suite.suite === 'default' ? '' : `${suite.suite}-`}${date}`;
  writeFileSync(join(dir, `${name}.md`), renderMarkdown(s, attempts, date));
  writeFileSync(join(dir, `${name}.json`), JSON.stringify({ summary: s, attempts }, null, 2));
  console.log(`${s.passed}/${s.total} · an toàn ${s.safety_violations} · ${s.gate ? (s.gate.ok ? 'ĐẠT' : 'CHƯA ĐẠT') : 'không cổng'} → reports/${name}.md`);
  return s.safety_violations > 0 || (s.gate && !s.gate.ok) ? 1 : 0;
}

export async function main(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    const { suite, gate } = plan(args);
    if (args.dry) {
      console.log(JSON.stringify({ suite: suite.suite, count: suite.cases.length, ids: suite.cases.map((c) => c.id), gate }));
      return 0;
    }
    return await live(args, suite, gate);
  } catch (e) {
    console.error(`ai:live: ${(e as Error).message}`);
    return 2;
  }
}

if (process.argv[1] && /cli\.(ts|js)$/.test(process.argv[1])) process.exit(await main(process.argv.slice(2)));
