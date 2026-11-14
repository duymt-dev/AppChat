// pnpm wt:redis -- start|stop|status [--k <n>] (TIP-035d, DC-908 b, Q-913): Memurai riêng mỗi worktree ở cổng 638{k}, dữ liệu
// `<wt>/.data/redis` — BullMQ / outbox / pub-sub / Socket.IO adapter không xuyên worktree (tách DB index không đủ: pub/sub bỏ qua DB).
// Không bao giờ đụng cổng 6379 / service Memurai của checkout chính; không cài service Windows (khởi động lại máy → `start` lại).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXE = process.env.MEMURAI_EXE || 'C:\\Program Files\\Memurai\\memurai.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lệnh RESP một lần (mảng bulk string) → chuỗi trả lời thô, null khi không nối được. */
export function resp(port, ...args) {
  return new Promise((ok) => {
    const s = net.connect(port, '127.0.0.1');
    let buf = '';
    const done = (v) => (s.destroy(), ok(v));
    s.setTimeout(2000, () => done(buf || null));
    s.once('error', () => done(buf || null));
    s.once('connect', () => s.write(`*${args.length}\r\n${args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join('')}`));
    s.on('data', (d) => {
      buf += d.toString();
      if (/^[+\-:]/.test(buf) && buf.endsWith('\r\n')) done(buf);
      const m = /^\$(\d+)\r\n/.exec(buf);
      if (m && buf.length >= m[0].length + Number(m[1]) + 2) done(buf);
    });
    s.once('end', () => done(buf || null));
  });
}
const ping = async (port) => (await resp(port, 'PING'))?.startsWith('+PONG') ?? false;

function context(argv) {
  const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const i = argv.indexOf('--k');
  let k = i >= 0 ? Number(argv[i + 1]) : NaN;
  if (Number.isNaN(k) && existsSync(join(top, '.env'))) k = Number(/^WORKTREE_ID=wt(\d)$/m.exec(readFileSync(join(top, '.env'), 'utf8'))?.[1]);
  if (!Number.isInteger(k) || k < 1 || k > 3) throw new Error('cần --k 1..3 hoặc WORKTREE_ID=wt{k} trong .env của worktree');
  const dir = resolve(top, '.data', 'redis');
  return { k, port: 6380 + k, dir, pidFile: join(dir, 'memurai.pid'), logFile: join(dir, 'memurai.log') };
}

async function start(c) {
  if (await ping(c.port)) return console.log(`Memurai ${c.port} đã chạy`), 0;
  if (!existsSync(EXE)) return console.error(`không thấy ${EXE} — đặt MEMURAI_EXE`), 1;
  mkdirSync(c.dir, { recursive: true });
  const log = openSync(c.logFile, 'a');
  const p = spawn(EXE, ['--port', String(c.port), '--bind', '127.0.0.1', '--dir', c.dir.replace(/\\/g, '/')], { detached: true, stdio: ['ignore', log, log], windowsHide: true });
  p.unref();
  writeFileSync(c.pidFile, String(p.pid));
  for (let i = 0; i < 25; i++) {
    if (await ping(c.port)) return console.log(`Memurai ${c.port} chạy (PID ${p.pid}, dữ liệu ${c.dir})`), 0;
    await sleep(200);
  }
  console.error(`Memurai ${c.port} không lên sau 5 giây — đuôi log:\n${existsSync(c.logFile) ? readFileSync(c.logFile, 'utf8').split('\n').slice(-10).join('\n') : ''}`);
  return 1;
}

async function stop(c) {
  const pid = existsSync(c.pidFile) ? Number(readFileSync(c.pidFile, 'utf8')) : null;
  if (await ping(c.port)) await resp(c.port, 'SHUTDOWN', 'NOSAVE');
  for (let i = 0; i < 25 && (await ping(c.port)); i++) await sleep(200);
  if ((await ping(c.port)) && pid) {
    try {
      process.kill(pid);
    } catch {
      /* đã thoát */
    }
  }
  rmSync(c.pidFile, { force: true });
  console.log(`Memurai ${c.port} ${(await ping(c.port)) ? 'VẪN CHẠY' : 'đã dừng'}`);
  return (await ping(c.port)) ? 1 : 0;
}

async function status(c) {
  const up = await ping(c.port);
  const info = up ? ((await resp(c.port, 'INFO', 'server')) ?? '') : '';
  const field = (k) => new RegExp(`^${k}:(.*)$`, 'm').exec(info)?.[1]?.trim() ?? '—';
  const pid = existsSync(c.pidFile) ? readFileSync(c.pidFile, 'utf8').trim() : '—';
  console.log(`Memurai wt${c.k}: ${up ? 'PONG' : 'không chạy'} · cổng ${up ? field('tcp_port') : c.port} · uptime ${up ? field('uptime_in_seconds') : '—'} s · PID ${pid} · dữ liệu ${c.dir}`);
  return up ? 0 : 1;
}

async function main(argv) {
  const cmd = argv.find((a) => ['start', 'stop', 'status'].includes(a));
  if (!cmd) return console.error('dùng: pnpm wt:redis -- start|stop|status [--k <n>]'), 2;
  let c;
  try {
    c = context(argv);
  } catch (e) {
    return console.error(`wt:redis: ${e.message}`), 2;
  }
  return cmd === 'start' ? start(c) : cmd === 'stop' ? stop(c) : status(c);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
