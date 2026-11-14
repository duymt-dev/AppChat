// Chụp prototype (baseline) và app V2 cho một entry của manifest — cùng viewport, font cục bộ, đồng hồ cố định.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { Browser, Page } from '@playwright/test';
import { FIXED_TIME, VIEWPORT, type ParityEntry } from '../parity.manifest';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const PROTO = path.join(ROOT, 'coding-packs/docs/06-prototype/AppChat.dc.html');
const require = createRequire(import.meta.url);
/** React / Babel mà support.js của prototype tải từ unpkg — lưu sẵn để đo offline, ổn định. */
const VENDOR = path.resolve(import.meta.dirname, '../vendor');

/** CSS @font-face từ @fontsource (đổi url sang host giả fonts.local để route trả file cục bộ). */
const localFontCss = (): string => {
  const files = [
    ...['400', '500', '600', '700', '800'].map((w) => `@fontsource/plus-jakarta-sans/${w}.css`),
    ...['400', '500', '600'].map((w) => `@fontsource/jetbrains-mono/${w}.css`),
  ];
  return files
    .map((f) => {
      const p = require.resolve(f);
      const dir = path.dirname(p);
      return fs
        .readFileSync(p, 'utf8')
        .replace(/url\(\.\/files\/([^)]+)\)/g, (_, file: string) => `url(https://fonts.local/${encodeURIComponent(path.join(dir, 'files', file))})`);
    })
    .join('\n');
};

const PROTO_SEED: Record<string, string> = { ac_authed: '1', ac_declared: '1', ac_trialseen: '1', ac_trialdays: '15' };

/** Mục OUT bị ẩn trong V2 → gỡ khỏi DOM prototype để vị trí còn lại khớp (prototype-parity §7). */
// TIP-026c: 'Báo cáo' (ẩn D07 / D19) + 'Tài chính' (chưa dựng tới TIP-032e) — rail prototype bản 2026-11-10 có hai mục này.
const OUT_LABELS = ['Gọi điện', 'Quy trình', 'Đối tác tiếp thị', 'Báo cáo', 'Tài chính'];

const removeOut = (page: Page) =>
  page.evaluate((labels) => {
    for (const el of document.querySelectorAll<HTMLElement>('.rail .navi, .rail .row')) {
      const text = el.textContent?.trim() ?? '';
      if (labels.some((l) => text === l || text.startsWith(l))) el.remove();
    }
    // pill module trên Tổng quan (thẻ "Module nghiệp vụ")
    for (const el of document.querySelectorAll<HTMLElement>('.dashwrap [style*="white-space: nowrap"]')) {
      if (labels.includes(el.textContent?.trim() ?? '') && el.children.length === 0) el.remove();
    }
  }, OUT_LABELS);

const settle = async (p: Page) => {
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
};

const newPage = async (browser: Browser) => {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  return page;
};

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const boxOf = async (page: Page, sel: string): Promise<Box> => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) throw new Error(`clipTo: ${sel} không hiển thị`);
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
};

/** Trả bbox của clipTo.proto (để app dùng cùng kích thước). */
export async function captureProto(browser: Browser, e: ParityEntry, out: string): Promise<Box | undefined> {
  const page = await newPage(browser);
  const css = localFontCss();
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('file:')) return route.continue();
    if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ contentType: 'text/css', body: css });
    if (url.startsWith('https://unpkg.com/')) {
      const name = url.slice('https://unpkg.com/'.length).replace(/[/@]/g, '_');
      return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(VENDOR, name)) });
    }
    if (url.startsWith('https://fonts.local/')) {
      return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(decodeURIComponent(url.slice(20))) });
    }
    return route.abort();
  });
  await page.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, { ...PROTO_SEED, ...e.protoStorage });
  await page.goto(pathToFileURL(PROTO).href);
  await page.waitForSelector(e.protoWait ?? '.appshell');
  await settle(page);
  await removeOut(page);
  if (e.proto) await e.proto(page);
  await removeOut(page);
  if (e.shellOnly) await page.addStyleTag({ content: '.appscroll > * { visibility: hidden !important; }' });
  await settle(page);
  const box = e.clipTo ? await boxOf(page, e.clipTo.proto) : undefined;
  await page.screenshot({ path: out, clip: box ?? e.clip, animations: 'disabled', caret: 'hide' });
  await page.context().close();
  return box;
}

export async function captureApp(browser: Browser, e: ParityEntry, baseUrl: string, out: string, protoBox?: Box) {
  const page = await newPage(browser);
  await page.goto(`${baseUrl}${e.route}${e.route.includes('?') ? '&' : '?'}parity=1`);
  await page.waitForSelector(e.appWait ?? '[data-testid="app-shell"]');
  await page.waitForLoadState('networkidle');
  if (e.shellOnly) await page.addStyleTag({ content: '[data-testid="app-shell"] main > div > * { visibility: hidden !important; }' });
  await settle(page);
  if (e.app) await e.app(page);
  // Drawer / modal tải lười (TIP-001b, shared/dynamic/lazy-drawers): chờ chunk về và khung skeleton biến mất trước khi chụp.
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="drawer-loading"]', { state: 'detached' });
  await settle(page);
  let clip = e.clip;
  if (e.clipTo && protoBox) {
    const b = await boxOf(page, e.clipTo.app);
    clip = { x: b.x, y: b.y, width: protoBox.width, height: protoBox.height };
  }
  await page.screenshot({ path: out, clip, animations: 'disabled', caret: 'hide' });
  await page.context().close();
}
