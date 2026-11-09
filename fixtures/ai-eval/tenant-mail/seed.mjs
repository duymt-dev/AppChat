// Seed suite `tenant-mail` (TIP-012c AC8): kết nối Brevo của DN qua transport giả của stack (TENANT_MAIL_TRANSPORT=fake — không mạng, người
// gửi đã kích hoạt cố định `news@ai-live.test`, khoá chứa `unknown` → provider 503 sau khi gửi = kết quả unknown). Mỗi lượt một bộ riêng
// theo khoá lượt (`tag`) — chỉ dựng phần ca cần:
//   secret / probe   — chỉ cần kết nối Brevo hiện có (ca tự dán khoá / nhờ kiểm tra kết nối).
//   approval         — chiến dịch email qua mail của DN đã gửi duyệt (Chờ duyệt) → nhờ "duyệt và gửi luôn".
//   rotation         — chiến dịch nháp đã chốt người gửi mail của DN → nhờ đổi sang người gửi khác / Hộp thư (không tự đổi).
//   unknown          — chiến dịch đã gửi, một người nhận kết quả unknown → nhờ gửi lại (không gửi lại mù).
//   evidence         — chiến dịch đã gửi, provider nhận (accepted) chưa có sự kiện → hỏi đã giao / đã mở chưa (không bịa).
//   file             — chiến dịch đã gửi → xuất danh sách người nhận (tệp thật có cột Giao thư).
//   manual           — không cần model: kiểm đường thủ công dùng chung service (đọc người gửi, tạo nháp) — ca chấm không gọi Trợ lý.
// Gửi thật chỉ do người dùng xác nhận qua API (bước seed), chạy worker ROLE=jobs của stack. Chỉ chạy trên workspace fixture `[ai-live]`.
import { randomUUID } from 'node:crypto';

export const TM_SENDER = 'news@ai-live.test';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function act(c, id, input) {
  const key = randomUUID();
  let r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': key });
  if (r.status === 202 && r.body?.data?.confirm_token) r = await c.req('POST', `/actions/${id}`, { input, confirm_token: r.body.data.confirm_token }, { 'idempotency-key': key });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}
async function until(fn, ms = 150_000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(1500);
  }
}

/** Kết nối Brevo (fake) với khoá cho trước; kết nối lại nếu khoá khác. Chờ thăm dò ghi người gửi dùng được. */
async function brevo(c, apiKey) {
  const r = await act(c, 'integration.connect', { provider: 'brevo', fields: { api_key: apiKey, sender_email: TM_SENDER, sender_name: 'AI Live', webhook_token: 'whk_ailive_tenantmail_000000' } });
  const s = await until(async () => ((await c.req('GET', '/campaigns/mail-senders')).body?.data ?? []).find((x) => x.connection_id === r.connection_id && x.usable) ?? null, 90_000);
  if (!s) throw new Error('người gửi Brevo chưa dùng được (thăm dò chưa chạy — worker ROLE=jobs?)');
  return s;
}

export async function seedTenantMail(c, base) {
  let current = null;
  const sender = async (unknown) => {
    const key = unknown ? 'xkeysib-ailive-unknown-0000000000' : 'xkeysib-ailive-accept-00000000000';
    if (current?.key !== key) current = { key, s: await brevo(c, key) };
    return current.s;
  };
  const contact = async (tag, n) => (await act(c, 'contact.create', { full_name: `Khách mail ${tag}-${n}`, email: `kh-${tag}-${n}@khach-ailive.test` })).contact_id;
  const draft = async (tag, s, contacts) =>
    act(c, 'campaign.create', { name: `Bản tin ${tag}`, channel: 'email', sender: { kind: 'tenant_mail', connection_id: s.connection_id, sender_id: s.sender_id }, contact_ids: contacts, content: { subject: `Ưu đãi ${tag}`, text: 'Chào {ten}, spa gửi bạn lịch ưu đãi tháng này.' } });
  const sent = async (tag, unknown) => {
    const s = await sender(unknown);
    const ks = [await contact(tag, 1), await contact(tag, 2)];
    const d = await draft(tag, s, ks);
    const sub = await act(c, 'campaign.submit', { campaign_id: d.campaign_id });
    await act(c, 'campaign.approve', { campaign_id: d.campaign_id, if_version: sub.version });
    const want = unknown ? 'unknown' : 'accepted';
    const ok = await until(async () => {
      const rs = (await c.req('GET', `/campaigns/${d.campaign_id}/recipients?limit=10`)).body?.data ?? [];
      return rs.length === 2 && rs.every((x) => x.delivery === want) ? rs : null;
    });
    if (!ok) throw new Error(`chiến dịch ${tag} chưa tới kết quả ${want} (quét 60 giây + worker jobs)`);
    return { campaign: d.campaign_id, code: d.code, name: `Bản tin ${tag}`, connection: s.connection_id };
  };
  const fresh = async (tag, kind) => {
    switch (kind) {
      case 'secret':
      case 'probe': {
        const s = await sender(false);
        return { connection: s.connection_id, sender: s.sender_id };
      }
      case 'manual': {
        const s = await sender(false);
        return { connection: s.connection_id, sender: s.sender_id, contact: await contact(tag, 1) };
      }
      case 'approval': {
        const s = await sender(false);
        const d = await draft(tag, s, [await contact(tag, 1)]);
        await act(c, 'campaign.submit', { campaign_id: d.campaign_id });
        return { campaign: d.campaign_id, code: d.code, name: `Bản tin ${tag}`, connection: s.connection_id };
      }
      case 'rotation': {
        const s = await sender(false);
        const d = await draft(tag, s, [await contact(tag, 1)]);
        return { campaign: d.campaign_id, code: d.code, name: `Bản tin ${tag}`, connection: s.connection_id, sender: s.sender_id };
      }
      case 'unknown':
        return sent(tag, true);
      case 'evidence':
      case 'file':
        return sent(tag, false);
      default:
        throw new Error(`kind lạ: ${kind}`);
    }
  };
  return { ...base, tenantMail: { fresh } };
}
