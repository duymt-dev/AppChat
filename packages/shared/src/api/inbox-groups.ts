// Quản lý nhóm Zalo trong Hộp thư (TIP-025b §A) — shape dùng chung api ↔ web ↔ mock. Ảnh chụp nhà cung cấp luôn kèm `fetched_at` +
// `complete`; số thành viên quan sát trong AppChat gắn nhãn `observed` (không phải toàn bộ nhóm). Không có URL link tham gia ở đây (chỉ
// trả qua lệnh sao chép riêng của người có quyền).
import { z } from 'zod';

export const GROUP_AI_POLICIES = ['mention', 'auto', 'off'] as const;
export type GroupAiPolicy = (typeof GROUP_AI_POLICIES)[number];
export const GROUP_COMMAND_KINDS = ['add_members', 'update', 'set_mute', 'refresh', 'link'] as const;
export const GROUP_ADD_MAX = 50;

export const groupCommandStateSchema = z.enum(['pending', 'confirmed', 'failed', 'unknown', 'partial', 'cancelled', 'superseded']);

export const groupStateSchema = z.object({
  conversation_id: z.string(),
  policy: z.enum(GROUP_AI_POLICIES),
  policy_version: z.number().int(),
  observed_members: z.number().int(),
  provider: z
    .object({
      name: z.string().nullable(),
      total: z.number().int().nullable(),
      complete: z.boolean(),
      account_role: z.enum(['owner', 'admin', 'member']).nullable(),
      link_enabled: z.boolean().nullable(),
      muted: z.boolean().nullable(),
      version: z.string().nullable(),
      fetched_at: z.string(),
    })
    .nullable(),
  /** Thao tác kênh hỗ trợ cho nhóm này (manifest + vai trò): giao diện chỉ hiện nút tương ứng. */
  supports: z.object({ refresh: z.boolean(), add_members: z.boolean(), update: z.boolean(), set_mute: z.boolean(), link: z.boolean() }),
  can_manage: z.boolean(),
  pending: z.array(z.object({ id: z.string(), kind: z.enum(GROUP_COMMAND_KINDS) })),
});
export type GroupStateDto = z.infer<typeof groupStateSchema>;

export const groupCommandSchema = z.object({
  id: z.string(),
  kind: z.enum(GROUP_COMMAND_KINDS),
  conversation_id: z.string(),
  state: groupCommandStateSchema,
  error: z.string().nullable(),
  members: z.array(z.object({ id: z.string(), status: z.enum(['confirmed', 'failed', 'unknown']), error: z.string().nullable() })).optional(),
  /** Lệnh `link` (TIP-025b §A.6): CHỈ trả cho người yêu cầu, trong 10 phút sau khi đọc; link đang tắt → `enabled:false`, `url:null`. */
  link: z.object({ enabled: z.boolean(), url: z.string().nullable() }).optional(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type GroupCommandDto = z.infer<typeof groupCommandSchema>;

/** Ứng viên thêm vào nhóm: khách đã nhắn 1-1 với CHÍNH tài khoản này, trong scope người xem (không id / SĐT tuỳ ý). */
export const groupCandidatesSchema = z.object({
  data: z.array(z.object({ conversation_id: z.string(), title: z.string(), contact_id: z.string().nullable() })),
  next_cursor: z.string().nullable(),
});
