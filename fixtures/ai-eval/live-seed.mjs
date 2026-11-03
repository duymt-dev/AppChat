// Seed workspace riêng cho bộ câu thử model thật (TIP-023b R1.4 · eval.md §7): đăng ký tài khoản fixture qua API thật, khai báo DN có
// dấu `[ai-live]` trong tên, tạo dữ liệu mẫu bằng action (một đường ghi). Fail closed: email phải thuộc miền fixture, tên workspace
// phải có dấu — không bao giờ chạy trên demo / tenant thật. Không xoá gì: seed lại chỉ bổ sung bản ghi thiếu theo tên.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MARKER = '[ai-live]';
export const FIXTURE_DOMAIN = '@ai-live.appchat.test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Dữ liệu mẫu cố định — ca trong `tools/ai-live/cases.yaml` nói theo các tên / mã này. */
export const SEED = {
  contacts: [
    { full_name: 'Nguyễn Thị Hoa', phone: '0901000001', city: 'TP.HCM', group: 'vip' },
    { full_name: 'Trần Văn Nam', phone: '0901000002', city: 'Hà Nội' },
    { full_name: 'Lê Minh Anh', phone: '0901000003', email: 'minhanh@example.com' },
    { full_name: 'Phạm Thu Trang', phone: '0901000004', group: 'potential' },
    { full_name: 'Nguyễn Hoa', phone: '0901000005', city: 'Đà Nẵng' },
  ],
  products: [
    { name: 'Gói chăm sóc da cơ bản', type: 'service', price: '500000', duration_min: 60, tax_rate: 8 },
    { name: 'Liệu trình trị mụn 10 buổi', type: 'package', price: '4500000', tax_rate: 8 },
    { name: 'Serum dưỡng ẩm 30ml', type: 'physical', price: '350000', tax_rate: 10, stock: 40 },
  ],
};

/** Mở phiên HTTP tới API; `env.AI_LIVE_EMAIL` phải thuộc miền fixture. */
export function client(api, email) {
  if (!email.endsWith(FIXTURE_DOMAIN)) throw new Error(`AI_LIVE_EMAIL phải kết thúc bằng ${FIXTURE_DOMAIN} (không dùng tài khoản demo / thật)`);
  const s = { token: '', ws: '' };
  const req = async (method, path, body, extra = {}) => {
    const headers = { 'content-type': 'application/json', ...extra };
    if (s.token) headers.authorization = `Bearer ${s.token}`;
    if (s.ws) headers['x-workspace-id'] = s.ws;
    const r = await fetch(api + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: r.status, body: json };
  };
  return { s, req };
}

async function otpFrom(mailDir, email) {
  const f = join(mailDir, `${email}.txt`);
  for (let i = 0; i < 75; i++) {
    if (existsSync(f)) {
      const all = [...readFileSync(f, 'utf8').matchAll(/\b(\d{6})\b/g)];
      if (all.length) return all[all.length - 1][1];
    }
    await sleep(200);
  }
  throw new Error(`không thấy OTP trong ${mailDir} — API phải chạy với MAIL_CONSOLE_DIR`);
}

/** Đăng nhập (mật khẩu, lần đầu đăng ký OTP); trả workspace và kiểm dấu fixture. */
export async function signIn(c, { email, password, mailDir }) {
  let r = await c.req('POST', '/auth/password/login', { email, password, remember: true });
  if (r.status !== 200) {
    if (!mailDir) throw new Error('chưa có tài khoản fixture — đặt AI_LIVE_MAIL_DIR (MAIL_CONSOLE_DIR của API) để đăng ký lần đầu');
    await c.req('POST', '/auth/otp/request', { email, purpose: 'register', locale: 'vi' });
    r = await c.req('POST', '/auth/otp/verify', { email, code: await otpFrom(mailDir, email), purpose: 'register', locale: 'vi' });
    if (r.status !== 200) throw new Error(`đăng ký lỗi ${r.status}`);
    c.s.token = r.body.data.access_token;
    if (r.body.data.needs_password) await c.req('POST', '/auth/password/set', { password });
  } else c.s.token = r.body.data.access_token;
  const me = await c.req('GET', '/me');
  c.s.ws = me.body?.data?.current_workspace_id ?? me.body?.data?.workspaces?.[0]?.id ?? '';
  if (!c.s.ws) throw new Error('không có workspace');
}

const act = async (c, id, input) => {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body?.error ?? r.body).slice(0, 200)}`);
  return r.body?.data?.result;
};

/** Khai báo DN có dấu fixture rồi chờ DB tenant sẵn sàng. Workspace đã có tên khác (không dấu) → dừng. */
async function declare(c) {
  const ses = await c.req('GET', '/session');
  // `/session` không trả tên workspace — lấy từ `/me` (workspace hiện tại).
  const me = (await c.req('GET', '/me')).body?.data;
  const name = me?.workspaces?.find((w) => w.id === c.s.ws)?.name ?? '';
  if (ses.body?.data?.declared) {
    if (!String(name).includes(MARKER)) throw new Error(`workspace "${name}" không có dấu ${MARKER} — từ chối seed`);
    return;
  }
  const profile = { kind: 'household', tax_code: '0300000001', legal_name: `Spa Thử AI ${MARKER}`, address: '1 Đường Thử, Quận 1, TP.HCM', representative: 'Người Thử', phone: '0900000000', business_description: 'Spa thử nghiệm cho bộ câu AI' };
  let declared = false;
  for (let i = 0; i < 90 && !declared; i++) {
    const r = await c.req('POST', '/actions/business_profile.update', { input: profile }, { 'idempotency-key': randomUUID() });
    declared = r.status === 200;
    if (!declared) await sleep(1000);
  }
  // Không khai báo được (DB tenant chưa provision — thiếu worker jobs?) → dừng: workspace chưa khai báo không có trial credit, mọi ca sẽ fail giả.
  if (!declared) throw new Error('business_profile.update không thành công sau 90 giây — kiểm worker ROLE=jobs cùng Redis với API');
  for (let i = 0; i < 60; i++) {
    if ((await c.req('GET', '/workspace/provisioning')).body?.data?.status === 'ready') break;
    await sleep(1000);
  }
  await c.req('POST', '/session/ack', { notice: 'trial_welcome' });
}

/** Seed đủ dữ liệu mẫu (bổ sung phần thiếu theo tên). Trả map tên → { id, code }. */
export async function seed(c) {
  await declare(c);
  const out = { contacts: {}, products: {} };
  const have = (await c.req('GET', '/contacts?limit=100')).body?.data ?? [];
  for (const x of SEED.contacts) {
    const found = have.find((h) => h.name === x.full_name || h.full_name === x.full_name);
    out.contacts[x.full_name] = found ? { id: found.id, code: found.code } : await act(c, 'contact.create', x).then((r) => ({ id: r.contact_id, code: r.code }));
  }
  const prods = (await c.req('GET', '/products?limit=100')).body?.data ?? [];
  for (const p of SEED.products) {
    const found = prods.find((h) => h.name === p.name);
    out.products[p.name] = found ? { id: found.id, code: found.code } : await act(c, 'product.create', p).then((r) => ({ id: r.product_id, code: r.code }));
  }
  const hoa = out.contacts['Nguyễn Thị Hoa'];
  const quotes = (await c.req('GET', '/quotes?limit=20')).body?.data ?? [];
  if (!quotes.length) {
    const item = SEED.products[1];
    const q = await act(c, 'quote.create', { contact_id: hoa.id, items: [{ product_id: out.products[item.name].id, name: item.name, qty: 1, unit_price: item.price, tax_rate: item.tax_rate }] });
    out.quote = { id: q.quote_id, code: q.code };
  } else out.quote = { id: quotes[0].id, code: quotes[0].code };
  return out;
}
