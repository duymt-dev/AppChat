// doc_template.search (TIP-023b R2 · DC-224, documents.manage, read): Trợ lý tra mẫu chứng từ còn hiệu lực theo tên / loại để có template_id.
// Không trả HTML, tệp DOCX, bản đồ ô hay kết quả bảng kiểm; thứ tự như Cài đặt › Mẫu chứng từ (mặc định trước, mới sửa trước).
import { Injectable } from '@nestjs/common';
import { foldText } from '@appchat/shared';
import type { ActionInput, docTemplateSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

type Input = ActionInput<typeof docTemplateSearch>;
type Out = { templates: { id: string; name: string; kind: string; version: number; is_default: boolean }[] };

@Injectable()
@ActionHandler('doc_template.search')
export class DocTemplateSearchHandler implements Handler<Input, Out> {
  async execute(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const rows = await tx.docTemplate.findMany({
      where: { deletedAt: null, ...(i.kind ? { kind: i.kind } : {}) },
      orderBy: [{ kind: 'asc' }, { isDefault: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: 500,
      select: { id: true, name: true, kind: true, version: true, isDefault: true },
    });
    const f = foldText(i.q ?? '');
    const templates = rows.filter((r) => !f || foldText(r.name).includes(f)).map((r) => ({ id: r.id, name: r.name, kind: r.kind, version: r.version, is_default: r.isDefault }));
    return { result: { templates: templates.slice(0, i.limit ?? 10) } };
  }
}
