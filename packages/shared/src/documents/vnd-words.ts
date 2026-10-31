// Số tiền bằng chữ cho chứng từ (`totals.total_words` — templates.md §3): 1250000 → "Một triệu hai trăm năm mươi nghìn đồng".
// Tiếng Việt theo cách đọc phổ thông (mốt / tư / lăm / linh); tiếng Anh đơn giản theo nhóm nghìn.

const VI = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const VI_SCALE = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

function viTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const out: string[] = [];
  if (full || h > 0) out.push(`${VI[h]} trăm`);
  if (t > 1) {
    out.push(`${VI[t]} mươi`);
    if (u === 1) out.push('mốt');
    else if (u === 4) out.push('tư');
    else if (u === 5) out.push('lăm');
    else if (u > 0) out.push(VI[u]!);
  } else if (t === 1) {
    out.push('mười');
    if (u === 5) out.push('lăm');
    else if (u > 0) out.push(VI[u]!);
  } else if (u > 0) {
    if (full || h > 0) out.push('linh');
    out.push(VI[u]!);
  }
  return out.join(' ');
}

const EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EN_SCALE = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion'];

function enTriple(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const out: string[] = [];
  if (h) out.push(`${EN[h]} hundred`);
  if (r >= 20) out.push(EN_TENS[Math.floor(r / 10)]! + (r % 10 ? `-${EN[r % 10]}` : ''));
  else if (r) out.push(EN[r]!);
  return out.join(' ');
}

const groups = (n: bigint) => {
  const g: number[] = [];
  for (let x = n; x > 0n; x /= 1000n) g.push(Number(x % 1000n));
  return g;
};

/** Số nguyên VND (string / number / bigint) → chữ, viết hoa chữ đầu, kết thúc "đồng" / "dong". Âm → "Âm …". */
export function vndWords(value: string | number | bigint, locale: string = 'vi'): string {
  let n = BigInt(typeof value === 'number' ? Math.trunc(value) : value);
  const neg = n < 0n;
  if (neg) n = -n;
  const en = locale.startsWith('en');
  let body: string;
  if (n === 0n) body = en ? 'zero' : 'không';
  else {
    const g = groups(n);
    const parts: string[] = [];
    for (let i = g.length - 1; i >= 0; i--) {
      if (!g[i]) continue;
      parts.push((en ? enTriple(g[i]!) : viTriple(g[i]!, i < g.length - 1)) + (en ? EN_SCALE[i] : VI_SCALE[i]));
    }
    body = parts.join(' ');
  }
  const s = `${neg ? (en ? 'minus ' : 'âm ') : ''}${body} ${en ? 'dong' : 'đồng'}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
