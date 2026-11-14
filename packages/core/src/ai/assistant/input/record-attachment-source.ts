// Adapter nguồn `assistant_artifact_ref` cho tệp đính kèm bản ghi (TIP-032d §3.3): AI input đăng ký vào registry trung lập của kernel —
// sales không import AI. Kiểm quyền nguồn HIỆN HÀNH (chủ / revision / phiên của run / tệp gốc còn) rồi trả bộ định vị bytes gốc. HTML / EML
// (đọc được ở 023f) không bao giờ thành tệp đính kèm bản ghi — chặn ngay ở nguồn. Không đụng artifact (purpose / phiên giữ nguyên).
import { AppError } from '@appchat/shared';
import { registerAttachmentSource, type AttachmentSourceAdapter } from '../../../kernel/files/attachment-source-registry';
import { sourceLocator } from './artifact-store';

const DENY_KINDS = new Set(['html', 'eml', 'markdown']);

export const ASSISTANT_ARTIFACT_SOURCE: AttachmentSourceAdapter = {
  kind: 'assistant_artifact_ref',
  async locate(db, a) {
    const s = await sourceLocator(db, { userId: a.userId, runId: a.runId, artifactId: a.ref.id, revision: a.ref.revision });
    if (s.kind && DENY_KINDS.has(s.kind)) throw new AppError('VALIDATION_FAILED', 422, { source: 'type_not_allowed' });
    return { fileId: s.fileId, digest: s.digest, name: s.name };
  },
};

export const registerAssistantArtifactSource = () => registerAttachmentSource(ASSISTANT_ARTIFACT_SOURCE);
