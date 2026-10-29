// D41: đưa prototype AppChat.dc.html về cùng thang token đều với packages/ui/tokens.ts (chạy lại nhiều lần vẫn ra cùng kết quả).
// - font-size → FONT_SCALE gần nhất (hoà → bậc nhỏ)
// - border-radius (px) → RADIUS_SCALE gần nhất
// - padding / margin / gap / inset / top / left / right / bottom → ≤ 8px: 2/4/6/8, > 8px: bội 4
// - màu viền #E9EBED → #E5E7EB (một màu viền)
// Áp cho cả style inline, CSS toàn cục, chuỗi style trong JS và selector [style*="…"] (giữ selector khớp).
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve(import.meta.dirname, '../../coding-packs/docs/06-prototype/AppChat.dc.html');
const FONT = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 48];
const RADIUS = [4, 6, 8, 10, 12, 16, 20];

const nearest = (v, scale) => scale.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), scale[0]);
const space = (v) => {
  const a = Math.abs(v);
  if (a === 0) return 0;
  const s = a <= 8 ? nearest(a, [2, 4, 6, 8]) : Math.max(8, Math.round((a - 0.01) / 4) * 4);
  return Math.sign(v) * s;
};
const px = (n) => `${Number(n.toFixed(2))}px`;

let src = fs.readFileSync(FILE, 'utf8');
const before = src;
let count = 0;
const sub = (re, fn) => {
  src = src.replace(re, (...m) => {
    const out = fn(...m);
    if (out !== m[0]) count++;
    return out;
  });
};

// font-size (cả "font-size:12.7px" lẫn "font-size: 12.7px" trong selector)
sub(/font-size:(\s?)(\d+(?:\.\d+)?)px/g, (_m, sp, v) => `font-size:${sp}${px(nearest(Number(v), FONT))}`);
// border-radius px (bỏ qua %, 999)
sub(/border-radius:(\s?)((?:-?\d+(?:\.\d+)?px\s?){1,4})/g, (_m, sp, vals) =>
  `border-radius:${sp}${vals.replace(/(\d+(?:\.\d+)?)px/g, (_x, v) => (Number(v) >= 999 ? `${v}px` : px(nearest(Number(v), RADIUS))))}`,
);
// spacing + vị trí
sub(
  // (?<![\w-]): không bắt "border-bottom:1px" / "scroll-padding" — chỉ thuộc tính spacing đứng riêng
  /(?<![\w-])(padding|padding-(?:top|bottom|left|right)|margin|margin-(?:top|bottom|left|right)|gap|row-gap|column-gap|inset|top|left|right|bottom):(\s?)((?:-?\d+(?:\.\d+)?px|0|auto)(?:\s(?:-?\d+(?:\.\d+)?px|0|auto)){0,3})(?=[;"'}`\s!])/g,
  (_m, prop, sp, vals) => `${prop}:${sp}${vals.replace(/(-?\d+(?:\.\d+)?)px/g, (_x, v) => px(space(Number(v))))}`,
);
// một màu viền
sub(/(border(?:-(?:top|bottom|left|right))?:[^;"]*?)#E9EBED/gi, (_m, pre) => `${pre}#E5E7EB`);

if (src !== before) fs.writeFileSync(FILE, src);
console.log(`normalize-prototype: ${count} giá trị đổi${src === before ? ' (đã chuẩn hoá từ trước)' : ''}`);
