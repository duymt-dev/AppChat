// pnpm i18n:check — vi (nguồn) và en phải đủ key như nhau; ngôn ngữ chưa bật chỉ báo độ phủ (standards/i18n §2, Blueprint §7.4).
// Key không được chứa "." (next-intl dùng "." để lồng — INVALID_KEY lúc chạy, cả trang lỗi): id có chấm (vd action) dùng "__".
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'apps/web/messages';
const REQUIRED = ['vi', 'en'];

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const keysOf = (locale) => {
  const dir = path.join(DIR, locale);
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => flatten(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), `${f.slice(0, -5)}.`)),
  );
};

/** Key chứa "." ở bất kỳ cấp nào (next-intl báo INVALID_KEY). */
const dotted = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => [
    ...(k.includes('.') ? [`${prefix}${k}`] : []),
    ...(v && typeof v === 'object' && !Array.isArray(v) ? dotted(v, `${prefix}${k}/`) : []),
  ]);

const source = keysOf('vi');
let failed = false;
for (const locale of fs.readdirSync(DIR)) {
  const dir = path.join(DIR, locale);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const bad = dotted(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), `${locale}/${f}: `);
    if (bad.length) {
      failed = true;
      console.error(`  key có dấu chấm (đổi "." → "__"): ${bad.join(', ')}`);
    }
  }
}
for (const locale of fs.readdirSync(DIR)) {
  const keys = keysOf(locale);
  const missing = [...source].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !source.has(k));
  const cover = source.size ? ((source.size - missing.length) / source.size) * 100 : 100;
  console.log(`${locale}: ${keys.size} key, phủ ${cover.toFixed(1)}%`);
  if (REQUIRED.includes(locale) && (missing.length || extra.length)) {
    failed = true;
    if (missing.length) console.error(`  thiếu: ${missing.join(', ')}`);
    if (extra.length) console.error(`  thừa (không có ở vi): ${extra.join(', ')}`);
  }
}
if (failed) process.exit(1);
