// Tạo nguồn RAG từ đề xuất đã duyệt (TIP-043): chạy TRONG transaction của `kb.suggestion.approve` — nguồn `origin=conversation`, kind
// text, body = hỏi + đáp đã sửa, visibility theo quy tắc nguồn mới của TIP-020b (chỉ định > thư mục > public, đọc thư mục trong tx — không
// tin model / FE). Không gọi Executor lồng; `kb-ingest` đẩy sau commit + event `kb.suggestion_approved` để consumer đẩy lại khi Redis lỗi.
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { folderVisibility, resolveVisibility, type KbVisibility } from '../source-policy';
import { sourceBody } from './suggestion.rules';

export interface PublishInput {
  question: string;
  answer: string;
  folderId: string | null;
  visibility: KbVisibility | undefined;
  createdBy: string | null;
  now: Date;
  locale?: string;
}

const NAME_MAX = 120;

export async function publishSource(tx: TenantTx, i: PublishInput): Promise<{ id: string; seq: number; visibility: KbVisibility }> {
  const visibility = resolveVisibility(i.visibility, await folderVisibility(tx, i.folderId));
  const id = uuidv7();
  const body = sourceBody(i.question, i.answer, i.locale);
  await tx.kbSource.create({
    data: {
      id, folderId: i.folderId, origin: 'conversation', kind: 'text', name: i.question.slice(0, NAME_MAX), visibility, body,
      learn: true, sizeBytes: BigInt(Buffer.byteLength(body)), createdBy: i.createdBy, createdAt: i.now,
    },
  });
  return { id, seq: 1, visibility };
}
