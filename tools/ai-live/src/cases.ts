// Bộ ca của `pnpm ai:live` (TIP-023b R1.4 · eval.md §2): schema chặt + nạp an toàn. Mặc định 30 ca `cases.yaml` (bất biến); `--cases <path>`
// chọn suite bổ sung JSON / YAML trong repo, chạy và báo cáo riêng (không đổi mẫu số 30, không rơi về bộ mặc định khi file lỗi).
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

export const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');
export const DEFAULT_CASES = join(REPO_ROOT, 'tools', 'ai-live', 'cases.yaml');
export const DEFAULT_COUNT = 30;
const MAX_BYTES = 256 * 1024;

export const CATEGORIES = ['lookup', 'update', 'create', 'delete', 'chain', 'clarify'] as const;
/** Phân bổ bộ mặc định (TIP-023b R1.4): tra cứu 8 · sửa 6 · tạo 6 · xoá / huỷ 3 · chuỗi 4 · hỏi lại 3. */
export const DEFAULT_MIX: Record<(typeof CATEGORIES)[number], number> = { lookup: 8, update: 6, create: 6, delete: 3, chain: 4, clarify: 3 };

const expectSchema = z
  .object({
    /** Action cuối cùng model phải gọi (`call_action`); bỏ trống với ca hỏi lại. */
    action: z.string().regex(/^[a-z_]+\.[a-z_.]+$/).optional(),
    /** Các action phải xuất hiện theo thứ tự (chuỗi nhiều bước). */
    sequence: z.array(z.string().regex(/^[a-z_]+\.[a-z_.]+$/)).max(8).optional(),
    /** Ô bắt buộc phải khớp (đường dẫn chấm `patch.phone`; giá trị `$seed.<…>` lấy từ seed). */
    input: z.record(z.string().max(80), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
    /** Ghi → phải có thẻ xác nhận; đọc → không được có. */
    confirm: z.boolean(),
    /** Model phải hỏi lại, không gọi action ghi. */
    ask_back: z.boolean().default(false),
  })
  .strict()
  .refine((e) => e.ask_back || e.action || e.sequence, { message: 'action_or_sequence_or_ask_back' });

export const caseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,40}$/),
    category: z.enum(CATEGORIES),
    seed: z.literal('live-seed'),
    actor: z.object({ role: z.enum(['owner']) }).strict(),
    locale: z.enum(['vi', 'en']),
    mode: z.enum(['chat', 'cowork']).default('cowork'),
    input: z.string().trim().min(1).max(1000),
    expect: expectSchema,
  })
  .strict();

export const suiteSchema = z
  .object({ suite: z.string().regex(/^[a-z0-9-]{2,40}$/), cases: z.array(caseSchema).min(1).max(200) })
  .strict()
  .superRefine((s, ctx) => {
    const seen = new Set<string>();
    for (const [i, c] of s.cases.entries()) {
      if (seen.has(c.id)) ctx.addIssue({ code: 'custom', path: ['cases', i, 'id'], message: 'duplicate_id' });
      seen.add(c.id);
    }
  });

export type LiveCase = z.infer<typeof caseSchema>;
export type Suite = z.infer<typeof suiteSchema>;

export class CasesError extends Error {}

/** Đường dẫn ca: tương đối gốc repo, phải nằm trong repo (kể cả sau symlink), ≤ 256 KB, đuôi .json / .yaml / .yml. */
export function resolveCasesPath(p: string, root = REPO_ROOT): string {
  if (isAbsolute(p)) throw new CasesError('cases_path_must_be_repo_relative');
  const abs = resolve(root, p);
  const inside = (x: string) => {
    const r = relative(root, x);
    return !!r && !r.startsWith('..') && !isAbsolute(r);
  };
  if (!inside(abs)) throw new CasesError('cases_path_outside_repo');
  let real: string;
  try {
    real = realpathSync(abs);
  } catch {
    throw new CasesError('cases_file_not_found');
  }
  if (!inside(real)) throw new CasesError('cases_path_outside_repo');
  if (!/\.(json|ya?ml)$/i.test(real)) throw new CasesError('cases_file_type');
  if (statSync(real).size > MAX_BYTES) throw new CasesError('cases_file_too_large');
  return real;
}

/** Parse JSON / YAML (không alias, không nhiều tài liệu) → zod chặt. Lỗi → CasesError (CLI thoát ≠ 0). */
export function parseSuite(text: string, kind: 'json' | 'yaml'): Suite {
  if (!text.trim()) throw new CasesError('cases_file_empty');
  let raw: unknown;
  try {
    raw = kind === 'json' ? JSON.parse(text) : parse(text, { maxAliasCount: 0, uniqueKeys: true, prettyErrors: false });
  } catch (e) {
    throw new CasesError(`cases_parse_failed: ${(e as Error).message.slice(0, 200)}`);
  }
  const r = suiteSchema.safeParse(raw);
  if (!r.success) throw new CasesError(`cases_schema_invalid: ${r.error.issues.slice(0, 5).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  return r.data;
}

export function loadSuite(path: string): Suite {
  return parseSuite(readFileSync(path, 'utf8'), /\.json$/i.test(path) ? 'json' : 'yaml');
}

/** Bộ mặc định: đúng 30 ca, đúng phân bổ — lệch là lỗi (không được thay ca lúc nghiệm thu — eval.md). */
export function loadDefault(): Suite {
  const s = loadSuite(DEFAULT_CASES);
  if (s.cases.length !== DEFAULT_COUNT) throw new CasesError(`default_suite_must_have_${DEFAULT_COUNT}_cases`);
  for (const c of CATEGORIES) {
    const n = s.cases.filter((x) => x.category === c).length;
    if (n !== DEFAULT_MIX[c]) throw new CasesError(`default_suite_mix_${c}_${n}_expected_${DEFAULT_MIX[c]}`);
  }
  return s;
}

/** Chọn suite theo tham số CLI: `--cases <path>` → đúng file đó; không truyền → bộ mặc định. `--only id,id` lọc, id lạ → lỗi. */
export function selectSuite(args: { cases?: string; only?: string[] }): Suite {
  const s = args.cases ? loadSuite(resolveCasesPath(args.cases)) : loadDefault();
  if (!args.only?.length) return s;
  const ids = new Set(s.cases.map((c) => c.id));
  const unknown = args.only.filter((id) => !ids.has(id));
  if (unknown.length) throw new CasesError(`unknown_case: ${unknown.join(',')}`);
  return { ...s, cases: s.cases.filter((c) => args.only!.includes(c.id)) };
}
