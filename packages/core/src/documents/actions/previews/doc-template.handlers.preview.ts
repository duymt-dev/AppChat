// Preview mẫu tài liệu (TIP-023b R2.8). Tạo (risk config) → mẫu mới (loại · nguồn · số trường) + có thành mặc định không; mẫu .docx
// thiếu tệp / placeholder sai → 422 như execute. Xoá (risk delete) → mẫu bị xoá mềm; mẫu mặc định → 409. Sửa (risk config): tên / nội dung (mẫu soạn) / trường (mẫu .docx) / mặc định trước / sau; đổi nội dung →
// phiên bản + 1, checklist pháp lý còn thiếu → cảnh báo. Biến lạ / placeholder không có trong tệp → 422, phiên bản cũ → 409, bỏ mặc định duy
// nhất → 422 như execute. Chỉ đọc.
import { AppError, type DocKind } from '@appchat/shared';
import type { ActionInput, ActionPreview, docTemplateCreate, docTemplateDelete, docTemplateUpdate } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import type { FilesService } from '../../../kernel/files/files.service';
import { checkDocxFields, checkRich, docxParas, liveTemplate } from '../../services/template-store';

export async function updatePreview(tx: TenantTx, files: FilesService | null, i: ActionInput<typeof docTemplateUpdate>): Promise<ActionPreview> {
  const t = await liveTemplate(tx, i.template_id);
  if (i.if_version !== undefined && i.if_version !== t.version) throw new AppError('STALE_VERSION', 409, { version: String(t.version) });
  if (i.is_default === false && t.isDefault) throw new AppError('VALIDATION_FAILED', 422, { is_default: 'need_one_default' });
  const kind = t.kind as DocKind;
  const next: Record<string, unknown> = { name: i.name, is_default: i.is_default };
  let checklist: { key: string; ok: boolean }[] | null = null;
  if (t.source === 'rich' && i.body !== undefined) {
    const r = checkRich(kind, i.body);
    next.body = r.body;
    checklist = r.checklist;
  }
  if (t.source === 'docx' && i.fields !== undefined) {
    if (!files) throw new AppError('INTERNAL', 500, undefined, 'doc_template.update cần FilesService');
    const fields = i.fields.map((f) => ({ placeholder: f.placeholder.trim(), variable: f.variable }));
    checklist = checkDocxFields(kind, await docxParas(tx, files, t.docxFileId!), fields);
    next.fields = fields;
  }
  const content = i.name !== undefined || next.body !== undefined || next.fields !== undefined;
  const missing = (checklist ?? []).filter((c) => !c.ok).map((c) => `missing:${c.key}`);
  return preview('config', line(t.name, `v${t.version + (content ? 1 : 0)}`), {
    changes: updated('doc_template', t.id, { name: t.name, body: t.bodyHtml, fields: t.fieldMap, is_default: t.isDefault }, next),
    ...(missing.length ? { warnings: missing } : {}),
  });
}

const warn = (checklist: { key: string; ok: boolean }[]) => {
  const missing = checklist.filter((c) => !c.ok).map((c) => `missing:${c.key}`);
  return missing.length ? { warnings: missing } : {};
};

export async function createPreview(tx: TenantTx, files: FilesService | null, i: ActionInput<typeof docTemplateCreate>): Promise<ActionPreview> {
  const kind = i.kind as DocKind;
  let checklist: { key: string; ok: boolean }[];
  let fields = 0;
  if (i.source === 'rich') checklist = checkRich(kind, i.body ?? '').checklist;
  else {
    if (!i.file_id) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'required' });
    if (!files) throw new AppError('INTERNAL', 500, undefined, 'doc_template.create cần FilesService');
    const map = (i.fields ?? []).map((f) => ({ placeholder: f.placeholder.trim(), variable: f.variable }));
    checklist = checkDocxFields(kind, await docxParas(tx, files, i.file_id), map);
    fields = map.length;
  }
  const isDefault = !!i.is_default || !(await tx.docTemplate.count({ where: { kind, isDefault: true, deletedAt: null } }));
  return preview('config', i.name, {
    changes: [created('doc_template', { kind, name: i.name, source: i.source, fields: i.source === 'docx' ? fields : undefined, is_default: isDefault })],
    ...warn(checklist),
  });
}

export async function deletePreview(tx: TenantTx, i: ActionInput<typeof docTemplateDelete>): Promise<ActionPreview> {
  const t = await liveTemplate(tx, i.template_id);
  if (t.isDefault) throw new AppError('CONFLICT', 409, { template_id: 'is_default' });
  return preview('delete', t.name, { changes: [removed('doc_template', t.id, { kind: t.kind, name: t.name, source: t.source, version: t.version })] });
}
