// Kiểm cấu hình agent của tài khoản kênh khi ghi (TIP-022b A + B — gọi từ channel.update_settings): lịch có cấu trúc hợp lệ; ứng viên
// phân luồng là agent ĐÃ XUẤT BẢN còn sống, không trùng, loại kênh cho phép; bật phân luồng cần ít nhất một ứng viên. Không cấp tool mới.
// `expected_version` (bản chụp lúc xem trước) lệch → 409 giữ gán cũ.
import { AppError, type ChannelRoutingDto, type WeeklyScheduleDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { assertSchedule } from './schedule-config';
import { bindingVersion } from '../../channels/services/binding-version';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function assertRouting(tx: Pick<TenantTx, 'aiAgent'>, routing: ChannelRoutingDto | undefined, channelType: string): Promise<ChannelRoutingDto | undefined> {
  if (!routing) return undefined;
  const ids = routing.candidates.map((c) => c.agent_id);
  if (new Set(ids).size !== ids.length) throw new AppError('VALIDATION_FAILED', 422, { 'routing.candidates': 'duplicate' });
  if (routing.enabled && !ids.length) throw new AppError('VALIDATION_FAILED', 422, { 'routing.candidates': 'required' });
  const ok = ids.filter((id) => UUID.test(id));
  const rows = ok.length ? await tx.aiAgent.findMany({ where: { id: { in: ok }, deletedAt: null }, select: { id: true, publishedVersion: true, channels: true } }) : [];
  const live = new Map(rows.map((r) => [r.id, r]));
  routing.candidates.forEach((c, i) => {
    const a = live.get(c.agent_id);
    if (!a || !a.publishedVersion) throw new AppError('VALIDATION_FAILED', 422, { [`routing.candidates.${i}.agent_id`]: 'not_published' });
    if (a.channels.length && !a.channels.includes(channelType)) throw new AppError('VALIDATION_FAILED', 422, { [`routing.candidates.${i}.agent_id`]: 'channel_not_allowed' });
  });
  return { enabled: routing.enabled, candidates: routing.candidates.map((c) => ({ ...c, keywords: [...new Set(c.keywords.map((k) => k.trim()).filter(Boolean))] })) };
}

export const scheduleForAccount = (s: WeeklyScheduleDto | null | undefined) => (s === undefined ? undefined : assertSchedule(s));

/** Gán đã bị đổi kể từ lúc xem trước → 409. */
export function assertBindingVersion(settings: unknown, expected: string | undefined): void {
  if (expected && bindingVersion(settings) !== expected) throw new AppError('CONFLICT', 409, { expected_version: 'stale' });
}
