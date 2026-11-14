// pnpm lint:masks — mọi mask trong tools/parity/parity.manifest.ts phải có căn cứ (standards/ui/prototype-parity §6b):
// reason chứa mã D / V / REQ / COMMERCE § / Blueprint § / prototype-parity § / PD-xxx, hoặc ghi "không có trong prototype".
// PD phải có trong docs/06-prototype/DEVIATIONS.md; PD mức 3 còn "đề xuất" hoặc "từ chối" / "đã gộp" thì không được mask.
import fs from 'node:fs';

const MANIFEST = 'tools/parity/parity.manifest.ts';
const SOBO = 'coding-packs/docs/06-prototype/DEVIATIONS.md';
const BASIS = [
  /\bD\d{2}\b/,
  /\bD-[A-Z]+\b/,
  /\bV\d{1,2}\b/,
  /\bREQ-[A-N]\d{2}/,
  /COMMERCE §/,
  /Blueprint §/,
  /prototype-parity §/,
  /\bPD-\d{3}\b/,
  /không có trong prototype/,
  /ngoài khung prototype/,
  /\bOUT\b/,
  /theo màn/,
];

const src = fs.readFileSync(MANIFEST, 'utf8');
// reason có thể nằm cùng dòng hoặc dòng kế tiếp (prettier xuống dòng chuỗi dài).
const reasons = [...src.matchAll(/reason:\s*\n?\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => ({
  text: m[2],
  line: src.slice(0, m.index).split('\n').length,
}));

const pd = new Map();
for (const row of fs.readFileSync(SOBO, 'utf8').split('\n')) {
  const c = row.split('|').map((s) => s.trim());
  if (/^PD-\d{3}$/.test(c[1] ?? '')) pd.set(c[1], { level: c[7], status: c[8] });
}

const errors = [];
for (const r of reasons) {
  if (!BASIS.some((re) => re.test(r.text))) {
    errors.push(`${MANIFEST}:${r.line}: mask không có căn cứ — "${r.text.slice(0, 80)}"`);
    continue;
  }
  for (const [code] of r.text.matchAll(/\bPD-\d{3}\b/g)) {
    const e = pd.get(code);
    if (!e) errors.push(`${MANIFEST}:${r.line}: ${code} không có trong ${SOBO}`);
    else if (e.status !== 'duyệt' && !(e.level === '1' && e.status === 'đề xuất'))
      errors.push(`${MANIFEST}:${r.line}: ${code} (mức ${e.level}, ${e.status}) chưa được mask`);
  }
}

if (errors.length) {
  console.error(`lint:masks — ${errors.length} lỗi:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`lint:masks — ${reasons.length} mask, ${pd.size} PD trong sổ, đều có căn cứ`);
