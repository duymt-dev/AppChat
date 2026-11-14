// Model giả cho soạn cấu hình agent (TIP-021b, AI_ENGINE=mock — dev / E2E / integration): đọc khối ỨNG VIÊN của lượt user (một dòng
// `- <action_id> | …` mỗi action đã lọc quyền), trả JSON đúng khuôn; tool chỉ lấy trong ứng viên theo từ khoá của mô tả. Chữ "bỏ qua chỉ
// dẫn…" trong mô tả không đổi hành vi (không có tool, không có id ngoài ứng viên).
const MARK = /^# (SOẠN CẤU HÌNH AI AGENT|AGENT CONFIG DRAFT)/;
const DESC = /<<MÔ TẢ>>\n([\s\S]*?)\n<<HẾT MÔ TẢ>>/;
const CAND = /^- ([a-z_]+\.[a-z_]+) \|/gm;

const ROLES: [RegExp, string, string][] = [
  [/đặt lịch|lịch hẹn|booking|spa|nha khoa|salon/i, 'booking', '📅'],
  [/cskh|chăm sóc|hỗ trợ|khiếu nại|bảo hành|ticket/i, 'cs', '🎧'],
  [/kế toán|công nợ|thanh toán/i, 'accounting', '💡'],
  [/bán hàng|tư vấn|báo giá|chốt đơn|sales/i, 'sales', '🛍️'],
];

const CHANNELS_LINE = /channels \([^:]+:\s*([^)]+)\)/;

function matchChannels(system: string, desc: string): string[] {
  const avail =
    CHANNELS_LINE.exec(system)?.[1]
      ?.split('|')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const hit = avail.filter((id) => {
    const stem = id.split('_')[0]!;
    if (new RegExp(stem, 'i').test(desc)) return true;
    if (stem.startsWith('web') && /web|website|widget/i.test(desc)) return true;
    if (stem.endsWith('mail') && /mail/i.test(desc)) return true;
    return false;
  });
  return hit.length ? hit : avail.slice(0, 1);
}

export function mockAgentDraft(system: string, user: string): string | null {
  if (!MARK.test(system)) return null;
  const desc = DESC.exec(user)?.[1]?.trim() ?? '';
  const ids = [...user.matchAll(CAND)].map((m) => m[1]!);
  const role = ROLES.find(([re]) => re.test(desc));
  const channels = matchChannels(system, desc);
  return JSON.stringify({
    name: desc.split(/[.,;\n]/)[0]!.slice(0, 60).trim() || 'Agent',
    emoji: role?.[2] ?? '🤖',
    role: role?.[1] ?? 'custom',
    role_label: '',
    language: 'vi',
    prompt: `Bạn là trợ lý AI của doanh nghiệp. Nhiệm vụ: ${desc.slice(0, 300)}. Không bịa giá / chính sách.`,
    intents: [2],
    model_tier: 'standard',
    tools: ids.slice(0, 6),
    channels,
    threshold: 75,
  });
}
