// Kết quả bản soạn (TIP-021b §3.1–3.2): `{ draft, generation_info }` nói thật — `mode: model` chỉ khi model trả đúng khuôn và đã kiểm;
// mẫu tất định luôn kèm `fallback_reason` đóng. Dừng cứng (credit / ngân sách / huỷ / usage không rõ / provider lỗi) → lỗi có mã + id
// lần soạn, KHÔNG bao giờ thành bản soạn. Đọc lại bản đã công bố luôn chiếu lại theo quyền hiện hành (bỏ tool vừa thu hồi + cảnh báo).
import { DRAFT_SCHEMA_VERSION, type draftGenerationInfo } from '@appchat/actions';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { z } from 'zod';
import type { Implemented } from '../../assistant/catalog';
import type { AgentConfig } from '../agent.store';
import type { DraftBinding } from './admission';
import { candidatesOf, discoveryOf } from './publication';
import { validateDraft, type DraftWarning } from './validation';

export type GenerationInfo = z.infer<typeof draftGenerationInfo>;
export type FallbackReason = NonNullable<GenerationInfo['fallback_reason']>;
export interface DraftOutput {
  draft: AgentConfig;
  generation_info: GenerationInfo;
}

export function generationInfo(b: Pick<DraftBinding, 'id' | 'candidateFingerprint'>, strategy: GenerationInfo['discovery_strategy'], warnings: DraftWarning[], fallback?: FallbackReason): GenerationInfo {
  return {
    schema_version: DRAFT_SCHEMA_VERSION,
    operation_id: b.id,
    mode: fallback ? 'deterministic' : 'model',
    discovery_strategy: strategy,
    ...(fallback ? { fallback_reason: fallback } : {}),
    warnings: [...new Set(warnings)],
    candidate_version: b.candidateFingerprint,
  };
}

/** Mã dừng cứng → lỗi API (không thông điệp provider). `operation_id` + `run_id` để giao diện thử lại cùng request_id / mở chi tiết. */
export function stopError(code: string, operationId: string, runId: string | null): AppError {
  const f = { operation_id: operationId, ...(runId ? { run_id: runId } : {}) };
  switch (code) {
    case 'CREDIT_EXHAUSTED':
      return new AppError('CREDIT_EXHAUSTED', 402, f);
    case 'FORBIDDEN':
      return new AppError('FORBIDDEN', 403, { ...f, permission: 'agents.manage' });
    case 'BUDGET':
    case 'CANCELLED':
    case 'USAGE_UNKNOWN':
    case 'CONFLICT':
      return new AppError('INVALID_STATE', 409, { ...f, draft: code.toLowerCase() });
    case 'stale':
    case 'stale_candidates':
    case 'abandoned':
    case 'privacy_erased':
      return new AppError('CONFLICT', 409, { ...f, draft: code });
    default:
      return new AppError('INTERNAL', 502, { ...f, draft: 'provider_error' });
  }
}

/** Bản đã công bố đọc lại (gửi lại cùng request_id / khôi phục): chiếu lại tool theo quyền HIỆN TẠI, cập nhật cảnh báo thu hồi. */
export function reproject(b: DraftBinding, authz: AuthzContext, implemented: Implemented): DraftOutput {
  const stored = b.publishedResult as DraftOutput;
  const keyword = discoveryOf(b.discovery).strategy !== 'hybrid';
  const v = validateDraft(stored.draft, candidatesOf(b.candidates), authz, implemented, keyword);
  return { draft: v.draft, generation_info: { ...stored.generation_info, warnings: [...new Set([...stored.generation_info.warnings, ...v.warnings])] } };
}
