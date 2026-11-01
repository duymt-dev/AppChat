// Ghi `doc_template` (templates.md §2–§6): kiểm biến theo registry của loại (biến lạ → 422 `fields`), làm sạch HTML mẫu rich, đọc tệp
// DOCX đã tải (kiểm macro / kích thước) + kiểm vị trí có trong tệp, bảng kiểm pháp lý lưu cùng mẫu, một mặc định mỗi loại.
import type { TenantDb } from '@appchat/db';
import { AppError, htmlText, legalChecklist, sanitizeTemplateHtml, templateVars, validateTemplateVars, type DocKind } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { FilesService } from '../../kernel/files/files.service';
import { docxParagraphs, openDocx } from './docx';

export interface Field {
  placeholder: string;
  variable: string;
}

/** Mẫu đang dùng (chưa xoá) hoặc 404. */
export async function liveTemplate(tx: Pick<TenantTx, 'docTemplate'>, id: string) {
  const t = /^[0-9a-f-]{36}$/i.test(id) ? await tx.docTemplate.findFirst({ where: { id, deletedAt: null } }) : null;
  if (!t) throw new AppError('NOT_FOUND', 404, { template_id: 'not_found' });
  return t;
}

/** Thân rich: làm sạch + kiểm biến. Trả thân đã sạch + biến dùng + bảng kiểm. */
export function checkRich(kind: DocKind, raw: string) {
  const body = sanitizeTemplateHtml(raw);
  const { vars, unknown } = templateVars(kind, body);
  if (unknown.length) throw new AppError('VALIDATION_FAILED', 422, { body: `unknown_vars:${unknown.join(',')}` });
  if (!vars.length) throw new AppError('VALIDATION_FAILED', 422, { body: 'no_vars' });
  return { body, checklist: legalChecklist(kind, htmlText(body), vars) };
}

/** Đoạn văn của tệp DOCX (purpose document) — tệp lạ / sai định dạng → 422 `file_id`. */
export async function docxParas(db: Pick<TenantDb, 'file'>, files: FilesService, fileId: string): Promise<string[]> {
  const f = /^[0-9a-f-]{36}$/i.test(fileId) ? await files.read(db, fileId) : null;
  if (!f || !/\.docx$/i.test(f.row.name)) throw new AppError('VALIDATION_FAILED', 422, { file_id: f ? 'not_docx' : 'not_found' });
  try {
    return docxParagraphs(openDocx(f.body));
  } catch (e) {
    if (e instanceof AppError && e.fields?.file) throw new AppError('VALIDATION_FAILED', 422, { file_id: e.fields.file });
    throw e;
  }
}

/** Vị trí → biến của mẫu DOCX: biến đúng loại, vị trí có thật trong tệp, không trùng. Trả bảng kiểm theo nội dung tệp + biến. */
export function checkDocxFields(kind: DocKind, paras: readonly string[], fields: readonly Field[]) {
  if (!fields.length) throw new AppError('VALIDATION_FAILED', 422, { fields: 'required' });
  const bad = validateTemplateVars(kind, fields.map((f) => f.variable));
  if (bad.length) throw new AppError('VALIDATION_FAILED', 422, { fields: `unknown_vars:${bad.join(',')}` });
  const seen = new Set<string>();
  fields.forEach((f, i) => {
    const ph = f.placeholder.trim();
    if (seen.has(ph)) throw new AppError('VALIDATION_FAILED', 422, { [`fields.${i}.placeholder`]: 'duplicate' });
    if (!paras.some((p) => p.includes(ph))) throw new AppError('VALIDATION_FAILED', 422, { [`fields.${i}.placeholder`]: 'not_in_file' });
    seen.add(ph);
  });
  return legalChecklist(kind, paras.join('\n'), fields.map((f) => f.variable));
}

/** Đặt mẫu làm mặc định của loại: tắt cờ mẫu cũ trước (unique partial `doc_template_default_uq`). Trả id mẫu mặc định cũ. */
export async function makeDefault(tx: Pick<TenantTx, 'docTemplate'>, kind: DocKind, id: string): Promise<string | null> {
  const prev = await tx.docTemplate.findFirst({ where: { kind, isDefault: true, deletedAt: null }, select: { id: true } });
  if (prev?.id === id) return null;
  if (prev) await tx.docTemplate.update({ where: { id: prev.id }, data: { isDefault: false } });
  await tx.docTemplate.update({ where: { id }, data: { isDefault: true } });
  return prev?.id ?? null;
}

export const missingOf = (checklist: unknown) => ((checklist ?? []) as { key: string; ok: boolean }[]).filter((c) => !c.ok).map((c) => c.key);
