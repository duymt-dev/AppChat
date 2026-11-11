// agent.draft_from_description (TIP-021b §1.1, §3.1): soạn cấu hình agent từ mô tả — KHÔNG ghi agent. `request_id` UUID là định danh
// bền của lần soạn (cùng người + cùng request_id + mô tả khác → 409); `generation_info` nói thật bản soạn do model hay mẫu tất định tạo,
// chiến lược tìm action, cảnh báo — chỉ là siêu dữ liệu đề xuất, không phải quyền.
import { z } from 'zod';
import { defineAction } from './define';
import { agentConfig } from './agent-config';

export const DRAFT_SCHEMA_VERSION = 1;

/** Lý do dùng mẫu tất định (đóng) — không bao giờ gắn mode `model` khi một trong các lý do này xảy ra. */
export const DRAFT_FALLBACK_REASONS = ['no_model_route', 'structured_unsupported', 'malformed_output'] as const;
/** Cảnh báo an toàn (mã, không lộ tên / mô tả action bị loại). */
export const DRAFT_WARNINGS = ['no_candidate_tools', 'tools_revoked', 'keyword_discovery'] as const;

export const draftGenerationInfo = z.object({
  schema_version: z.number().int(),
  operation_id: z.string(),
  mode: z.enum(['model', 'deterministic']),
  discovery_strategy: z.enum(['hybrid', 'keyword', 'none']),
  fallback_reason: z.enum(DRAFT_FALLBACK_REASONS).optional(),
  warnings: z.array(z.enum(DRAFT_WARNINGS)),
  candidate_version: z.string(),
});

export const agentDraftFromDescription = defineAction({
  id: 'agent.draft_from_description',
  module: 'ai',
  title: 'actions.agent.draft_from_description.title',
  description:
    'Draft a full agent config from a plain-language description (no write — publish separately with agent.create_and_publish). request_id is a new UUID per draft; resend the same one only when retrying the same description. Example: {"description":"Agent CSKH cho spa, đặt lịch qua Zalo","request_id":"5f0e7c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b"}',
  input: z.object({ description: z.string().trim().min(4).max(2000), request_id: z.string().uuid() }),
  output: z.object({ draft: agentConfig, generation_info: draftGenerationInfo }),
  permission: 'agents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
