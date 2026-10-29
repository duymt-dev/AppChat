// pnpm parity <id…> | --done | --all | --changed      pnpm parity:baseline [id…]
// App phải đang chạy (PARITY_APP_URL, mặc định http://localhost:3000, NEXT_PUBLIC_API_MODE=mock).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { MANIFEST, MAX_DIFF_RATIO, type ParityEntry } from '../parity.manifest';
import { captureApp, captureProto } from './capture';
import { compareImages } from './compare';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const OUT = path.resolve(import.meta.dirname, '../out');
const REPORT = path.join(ROOT, 'coding-packs/reports/goal-fe-prototype.md');
const APP_URL = process.env.PARITY_APP_URL ?? 'http://localhost:3000';

const [cmd = 'compare', ...args] = process.argv.slice(2);

/** ID dòng đang ✅ trong report (dùng cho --done). */
const doneIds = (): Set<string> => {
  const md = fs.readFileSync(REPORT, 'utf8');
  return new Set([...md.matchAll(/^\| `([^`]+)` \|[^\n]*\| ✅ \|/gm)].map((m) => m[1]!));
};

/** --changed: file đổi so với origin/dev → id theo module; đổi lớp dùng chung → mọi id. */
const changedIds = (): Set<string> => {
  const files = execSync('git diff --name-only origin/dev...HEAD', { cwd: ROOT, encoding: 'utf8' }).split('\n');
  const shared = files.some((f) =>
    /^(packages\/(ui|shared)|apps\/web\/src\/(shared|app\/layout)|tools\/parity|fixtures\/prototype-parity)\//.test(f),
  );
  if (shared) return new Set(MANIFEST.map((e) => e.id));
  const modules = new Set(files.map((f) => f.match(/^apps\/web\/src\/features\/([^/]+)\//)?.[1]).filter(Boolean));
  return new Set(MANIFEST.filter((e) => modules.has(e.id.split(':')[0])).map((e) => e.id));
};

const select = (): ParityEntry[] => {
  if (args.includes('--all') || (cmd === 'baseline' && args.length === 0)) return MANIFEST;
  if (args.includes('--done')) {
    const done = doneIds();
    return MANIFEST.filter((e) => done.has(e.id));
  }
  if (args.includes('--changed')) {
    const ids = changedIds();
    return MANIFEST.filter((e) => ids.has(e.id));
  }
  const want = args.filter((a) => !a.startsWith('--'));
  const picked = MANIFEST.filter((e) => want.some((w) => e.id === w || e.id.startsWith(`${w}:`)));
  const unknown = want.filter((w) => !MANIFEST.some((e) => e.id === w || e.id.startsWith(`${w}:`)));
  if (unknown.length) throw new Error(`unknown parity id: ${unknown.join(', ')}`);
  return picked;
};

const file = (id: string, kind: string) => path.join(OUT, `${id.replace(/:/g, '-')}.${kind}.png`);

async function main() {
  const entries = select();
  if (!entries.length) {
    console.log('parity: no entries selected');
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const rows: { id: string; ratio: number | null; ok: boolean; error?: string }[] = [];
  try {
    for (const e of entries) {
      try {
        const box = await captureProto(browser, e, file(e.id, 'proto'));
        if (cmd === 'baseline') {
          rows.push({ id: e.id, ratio: null, ok: true });
          continue;
        }
        await captureApp(browser, e, APP_URL, file(e.id, 'app'), box);
        const r = compareImages(file(e.id, 'proto'), file(e.id, 'app'), file(e.id, 'diff'), e);
        rows.push({ id: e.id, ratio: r.ratio, ok: r.ratio <= (e.maxDiffRatio ?? MAX_DIFF_RATIO) });
      } catch (err) {
        rows.push({ id: e.id, ratio: null, ok: false, error: (err as Error).message.split('\n')[0] });
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(rows, null, 2));
  for (const r of rows) {
    const val = r.ratio === null ? (r.error ?? 'baseline') : r.ratio.toFixed(4);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(34)} ${val}`);
  }
  if (rows.some((r) => !r.ok)) process.exit(1);
}

await main();
