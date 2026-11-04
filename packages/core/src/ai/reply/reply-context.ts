// Lắp ngữ cảnh cho một lượt agent trực kênh (Blueprint §5.3 bước 2): cấu hình theo phiên bản đã xuất bản, 20 tin gần nhất, khách
// rút gọn + `contact_memory`, top-6 đoạn kho tri thức `public` trong `kb_scope` (không căn cứ → ghi rõ, cấm bịa), giờ hoạt động +
// lời chào của tài khoản, từ cấm governance. PII che bằng `PiiMasker` trước khi vào messages / system (agent-gateway §9).
import { PiiMasker, prompt, type Embedder, type PiiMap, type RunMessage } from '@appchat/ai';
import { foldText } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { settingsOf } from '../../channels/public';
import { agentSystem } from '../agents/agent.runtime';
import { blankConfig, merge, type AgentConfig } from '../agents/agent.store';
import { readGovernance } from '../governance/governance';
import { searchKb, type KbSearchResult } from '../kb/search';
import { recentFacts } from '../../crm/public';

export const HISTORY = 20;
/** Fact trí nhớ khách vào ngữ cảnh: 20 fact cập nhật gần nhất (TIP-015b; trần lưu 50). */
export const MEMORY = 20;

/** Hướng dẫn tool ghi nhớ (chỉ khi agent được cấp `contact.remember`). */
const REMEMBER_RULE =
  '# GHI NHỚ\nKhi khách nêu thông tin bền vững về chính họ (sở thích, dị ứng, lịch quen, người liên hệ), gọi tool contact__remember với một câu ngắn. ' +
  'Chỉ ghi điều khách nói rõ, không suy đoán; không ghi lại điều đã có trong mục Ghi nhớ. Tuyệt đối không ghi số CCCD / CMND, số thẻ, mật khẩu, mã OTP.';

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;
type Agent = NonNullable<Awaited<ReturnType<TenantDb['aiAgent']['findUnique']>>>;

export interface ReplyContext {
  agent: Agent;
  cfg: AgentConfig;
  version: number;
  system: string;
  messages: RunMessage[];
  pii: PiiMap;
  /** Tin khách cuối (đã gom) + các tin khách trước (fold, mới nhất trước) — luật lặp câu / đòi gặp người. */
  lastCustomer: string;
  previousCustomer: string[];
  banned: string[];
  piiOn: boolean;
  kb: KbSearchResult | null;
}

/** Cấu hình agent đang chạy: phiên bản đã xuất bản (agent-gateway §10b); agent nháp / tạm dừng / đã xoá → null. */
export async function publishedAgent(db: TenantDb, agentId: string): Promise<{ agent: Agent; cfg: AgentConfig; version: number } | null> {
  const agent = await db.aiAgent.findUnique({ where: { id: agentId } });
  if (!agent || agent.deletedAt || agent.status !== 'active' || !agent.publishedVersion) return null;
  const v = await db.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: agent.id, version: agent.publishedVersion } } });
  if (!v) return null;
  return { agent, cfg: merge(blankConfig(agent.name), v.config as Partial<AgentConfig>), version: v.version };
}

/** Tin của hội thoại cho model: tin khách = user, tin AppChat (người / agent) = assistant; bỏ tin đã xoá / thu hồi / trước mốc xoá. */
async function history(db: TenantDb, c: Conv) {
  const rows = await db.message.findMany({
    where: { conversationId: c.id, deletedAt: null, recalledAt: null, direction: { not: null }, kind: { notIn: ['note', 'system'] }, ...(c.clearedAt ? { createdAt: { gt: c.clearedAt } } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: HISTORY,
    select: { direction: true, body: true, kind: true, senderName: true, senderType: true },
  });
  return rows.reverse();
}

const text = (m: { kind: string; body: string }) => (m.kind === 'text' ? m.body : m.body ? `[${m.kind}] ${m.body}` : `[${m.kind}]`);

export async function buildReplyContext(db: TenantDb, c: Conv, a: { agent: Agent; cfg: AgentConfig; version: number }, embedder: Embedder | null, pii: PiiMap = {}): Promise<ReplyContext> {
  const gov = await readGovernance(db);
  const piiOn = gov.piiFilter && a.cfg.governance.pii !== false;
  const masker = new PiiMasker(pii);
  const mask = (s: string) => (piiOn ? masker.mask(s) : s);

  const msgs = await history(db, c);
  // Gom tin liên tiếp cùng phía thành một lượt (model không nhận hai lượt user liền nhau tốt).
  const messages: RunMessage[] = [];
  for (const m of msgs) {
    const role = m.direction === 'in' ? 'user' : 'assistant';
    const body = mask(text(m));
    const prev = messages[messages.length - 1];
    if (prev && prev.role === role) prev.content = `${prev.content as string}\n${body}`;
    else messages.push({ role, content: body });
  }
  while (messages.length && messages[0]!.role !== 'user') messages.shift();

  const customer = msgs.filter((m) => m.direction === 'in');
  // Lượt khách cuối = các tin khách sau tin trả lời cuối cùng.
  const lastOut = msgs.map((m) => m.direction).lastIndexOf('out');
  const lastTurn = msgs.slice(lastOut + 1).filter((m) => m.direction === 'in').map((m) => m.body).join('\n');
  const previous = customer.slice(0, Math.max(0, customer.length - msgs.slice(lastOut + 1).filter((m) => m.direction === 'in').length)).reverse().map((m) => foldText(m.body));

  const contact = c.contactId ? await db.contact.findUnique({ where: { id: c.contactId }, select: { name: true, group: true, locale: true, stage: true } }) : null;
  const memory = c.contactId ? await recentFacts(db, c.contactId, MEMORY) : [];
  const account = await db.channelAccount.findUnique({ where: { id: c.channelAccountId } });
  const st = account ? settingsOf(account) : null;

  const kb = lastTurn.trim()
    ? await searchKb(db, embedder, { query: lastTurn.slice(0, 500), visibility: ['public'], folderIds: a.cfg.kb_scope.folder_ids, tags: a.cfg.kb_scope.tags }).catch(() => null)
    : null;
  const docs = kb?.grounded && kb.chunks.length
    ? kb.chunks.map((h, i) => `[${i + 1}] ${h.source_name}${h.path.length ? ` › ${h.path.join(' › ')}` : ''}\n${h.content}`).join('\n\n')
    : 'Không có tài liệu phù hợp — không tự đưa thông tin, hỏi lại hoặc chuyển nhân viên.';

  const locale = a.cfg.language === 'en' || (a.cfg.language === 'auto' && contact?.locale?.startsWith('en')) ? 'en' : 'vi';
  const rules = prompt('agent-reply', locale, { channel: account?.name ?? c.channelType, contact: mask(contact?.name ?? c.title ?? ''), hours: st?.hours ?? '' });
  const system = [
    agentSystem(a.cfg),
    '',
    rules.text,
    '',
    '# KHÁCH',
    `- Tên: ${mask(contact?.name ?? '')}${contact?.group ? ` · nhóm ${contact.group}` : ''}${contact?.stage ? ` · giai đoạn ${contact.stage}` : ''}`,
    ...memory.map((m) => `- Ghi nhớ: ${mask(m.fact)}`),
    ...(a.cfg.tools.includes('contact.remember') && c.contactId ? ['', REMEMBER_RULE] : []),
    ...(st?.greeting ? ['', `# LỜI CHÀO CỦA KÊNH\n${st.greeting}`] : []),
    '',
    '# TÀI LIỆU',
    mask(docs),
  ].join('\n');

  return {
    ...a,
    system,
    messages,
    pii: masker.map,
    lastCustomer: foldText(lastTurn),
    previousCustomer: previous,
    banned: gov.bannedWords.map((w) => foldText(w)).filter(Boolean),
    piiOn,
    kb,
  };
}
