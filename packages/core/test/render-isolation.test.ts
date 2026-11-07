// TIP-030b spec 6 — đổi DOCX không tin cậy qua launcher cô lập (DC-321): chưa cấu hình → 501 đóng an toàn (không ngầm chạy soffice);
// launcher giả: thành công đọc out/in.pdf, mã 124 → 504 timeout, treo quá giờ → giết cả cây tiến trình; thư mục tạm luôn bị dọn; tối đa
// 2 lần đổi cùng lúc. Launcher thật (tools/sandbox/render-*.{sh,ps1}) dùng cùng giao kèo — chạy thật ở integration khi máy có cấu hình.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { benignDocx } from '../../../fixtures/contracts/files/build-fixtures';
import { ISOLATED_CONCURRENCY, LauncherConverter, isolationLauncher } from '../src/documents/security/render-isolation';

const WIN = process.platform === 'win32';
let dir: string;
let launcher: string;
let log: string;

// Launcher giả theo giao kèo `<launcher> <soffice> <root> <giây>`; hành vi theo FAKE_RENDER_MODE (ok | code124 | hang).
const PS1 = `param($Soffice, $Root, $Seconds)
$start = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
Set-Content -Path (Join-Path $env:FAKE_RENDER_LOG ("pid-" + $PID)) -Value $PID
switch ($env:FAKE_RENDER_MODE) {
  'code124' { exit 124 }
  'hang' { Start-Sleep -Seconds 120; exit 0 }
}
Start-Sleep -Milliseconds 700
New-Item -ItemType Directory -Force (Join-Path $Root 'out') | Out-Null
Copy-Item (Join-Path $Root 'in.docx') (Join-Path $Root 'out\\in.pdf')
$end = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
Set-Content -Path (Join-Path $env:FAKE_RENDER_LOG ([guid]::NewGuid().ToString() + '.span')) -Value "$start $end $Root"
exit 0
`;
const SH = `#!/bin/sh
start=$(date +%s%3N)
echo $$ > "$FAKE_RENDER_LOG/pid-$$"
case "$FAKE_RENDER_MODE" in code124) exit 124 ;; hang) sleep 120; exit 0 ;; esac
sleep 0.7
mkdir -p "$2/out" && cp "$2/in.docx" "$2/out/in.pdf"
echo "$start $(date +%s%3N) $2" > "$FAKE_RENDER_LOG/$$-$(date +%s%N).span"
`;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'render-iso-test-'));
  log = join(dir, 'log');
  await (await import('node:fs/promises')).mkdir(log);
  launcher = join(dir, WIN ? 'fake.ps1' : 'fake.sh');
  await writeFile(launcher, WIN ? PS1 : SH, { mode: 0o755 });
  process.env.FAKE_RENDER_LOG = log;
});

afterAll(async () => {
  delete process.env.FAKE_RENDER_LOG;
  delete process.env.FAKE_RENDER_MODE;
  await rm(dir, { recursive: true, force: true });
});

const fail = async (p: Promise<unknown>) => {
  const e = await p.then(
    () => null,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(AppError);
  return { status: (e as AppError).httpStatus, render: (e as AppError).fields?.render };
};

const leftovers = async () => (await readdir(tmpdir())).filter((n) => n.startsWith('appchat-isolated-'));

describe('isolated DOCX render (DC-321)', () => {
  it('no launcher configured / missing path → 501 render_isolation_unavailable (fail closed)', async () => {
    expect(isolationLauncher({})).toBeNull();
    expect(isolationLauncher({ RENDER_ISOLATION_LAUNCHER: join(dir, 'nope.sh') })).toBeNull();
    expect(isolationLauncher({ RENDER_ISOLATION_LAUNCHER: launcher })).toBe(launcher);
    // Chế độ Windows chỉ Job Object (không cô lập mạng — DV-024) không bao giờ được dùng ở production.
    expect(isolationLauncher({ RENDER_ISOLATION_LAUNCHER: launcher, RENDER_ISOLATION_WINDOWS_MODE: 'job-dev', NODE_ENV: 'production' })).toBeNull();
    expect(isolationLauncher({ RENDER_ISOLATION_LAUNCHER: launcher, RENDER_ISOLATION_WINDOWS_MODE: 'job-dev', NODE_ENV: 'test' })).toBe(launcher);
    expect(await fail(new LauncherConverter(null, 'soffice').docxToPdf(Buffer.from('x')))).toEqual({ status: 501, render: 'render_isolation_unavailable' });
  });

  it('success reads out/in.pdf and removes its own temp dir', async () => {
    process.env.FAKE_RENDER_MODE = 'ok';
    const before = await leftovers();
    const out = await new LauncherConverter(launcher, 'soffice').docxToPdf(Buffer.from('PDF-BYTES'));
    expect(out.toString()).toBe('PDF-BYTES');
    expect(await leftovers()).toEqual(before);
  }, 20_000);

  it('launcher exit 124 → 504 timeout; temp dir removed', async () => {
    process.env.FAKE_RENDER_MODE = 'code124';
    const before = await leftovers();
    expect(await fail(new LauncherConverter(launcher, 'soffice').docxToPdf(Buffer.from('x')))).toEqual({ status: 504, render: 'timeout' });
    expect(await leftovers()).toEqual(before);
  }, 20_000);

  it('hung launcher past deadline → 504 and the whole process tree is killed', async () => {
    process.env.FAKE_RENDER_MODE = 'hang';
    for (const f of await readdir(log)) if (f.startsWith('pid-')) await rm(join(log, f));
    expect(await fail(new LauncherConverter(launcher, 'soffice', 200).docxToPdf(Buffer.from('x')))).toEqual({ status: 504, render: 'timeout' });
    const pids = await Promise.all((await readdir(log)).filter((f) => f.startsWith('pid-')).map(async (f) => Number((await readFile(join(log, f), 'utf8')).trim())));
    expect(pids.length).toBe(1);
    const alive = (pid: number) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    // taskkill /T trên Windows khi cả bộ test chạy song song có thể chậm vài giây — chờ tới 15 giây (vẫn đỏ nếu tiến trình còn sống).
    for (let i = 0; i < 150 && pids.some(alive); i++) await new Promise((r) => setTimeout(r, 100));
    expect(pids.filter(alive)).toEqual([]);
  }, 30_000);

  it(`at most ${ISOLATED_CONCURRENCY} conversions run at once`, async () => {
    process.env.FAKE_RENDER_MODE = 'ok';
    for (const f of await readdir(log)) if (f.endsWith('.span')) await rm(join(log, f));
    const conv = new LauncherConverter(launcher, 'soffice');
    await Promise.all(Array.from({ length: 5 }, (_, i) => conv.docxToPdf(Buffer.from(`doc-${i}`))));
    const spans = await Promise.all((await readdir(log)).filter((f) => f.endsWith('.span')).map(async (f) => (await readFile(join(log, f), 'utf8')).trim().split(' ').slice(0, 2).map(Number) as [number, number]));
    expect(spans).toHaveLength(5);
    const peak = Math.max(...spans.map(([s]) => spans.filter(([a, b]) => a <= s && s < b).length));
    expect(peak).toBeLessThanOrEqual(ISOLATED_CONCURRENCY);
  }, 60_000);
});

// Kiểm cô lập thật của launcher Windows (manifest: "native network/filesystem/process-tree isolation conformance"): nạp đúng helper C# của
// tools/sandbox/render-windows.ps1, chạy lệnh dò trong AppContainer không capability — mạng bị chặn, ghi ngoài thư mục tạm bị từ chối;
// rồi đổi DOCX thật bằng soffice qua launcher (chế độ job-dev — DV-024, vì LibreOffice treo khi khởi tạo trong AppContainer, Q-047).
const SOFFICE_WIN = String.raw`C:\Program Files\LibreOffice\program\soffice.com`;
describe.runIf(WIN)('Windows launcher conformance (native)', () => {
  const ps = (script: string) => execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });

  it('AppContainer blocks network and writes outside the temp root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'appchat-isolated-'));
    const outside = join(dir, 'escape.txt');
    try {
      const launcherPath = join(__dirname, '../../../tools/sandbox/render-windows.ps1');
      const out = ps(`
        $src = Get-Content -Raw '${launcherPath}'
        Add-Type -TypeDefinition ([regex]::Match($src, "(?s)@'\r?\n(.*?)\r?\n'@").Groups[1].Value)
        $sid = [RenderSandbox]::SidString('appchat-render')
        icacls '${root}' /grant "*\${sid}:(OI)(CI)F" /T /Q | Out-Null
        $p = '${join(root, 'probe.txt')}'
        $c = [RenderSandbox]::Run('appchat-render', "cmd.exe /c (curl -s -m 5 -o NUL -w net=%{http_code} https://example.com) > \`"$p\`" 2>&1 & (echo x > \`"${outside}\`") 2>> \`"$p\`" & echo inside > \`"${join(root, 'inside.txt')}\`"", '${root}', 20000, 1GB, 32)
        "code=$c"; Get-Content $p`);
      expect(out).toContain('code=0');
      expect(out).toMatch(/net=000/);
      expect(out).toMatch(/Access is denied|denied/i);
      expect(existsSync(outside)).toBe(false);
      expect(existsSync(join(root, 'inside.txt'))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 60_000);

  it.runIf(existsSync(SOFFICE_WIN))('real DOCX → PDF through the launcher (job-dev), temp root cleaned', async () => {
    process.env.RENDER_ISOLATION_WINDOWS_MODE = 'job-dev';
    try {
      const before = await leftovers();
      const conv = new LauncherConverter(join(__dirname, '../../../tools/sandbox/render-windows.ps1'), SOFFICE_WIN);
      const pdf = await conv.docxToPdf(benignDocx());
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(await leftovers()).toEqual(before);
    } finally {
      delete process.env.RENDER_ISOLATION_WINDOWS_MODE;
    }
  }, 120_000);
});
