// doc_template.create / update / delete / detect_fields (Blueprint §3.4, D30 — standards/documents/templates.md). Mẫu chỉ là trình bày:
// số liệu luôn từ bản ghi có cấu trúc. Lưu mẫu DOCX chỉ khi đã qua bước người xác nhận vị trí → biến (field_map). Xoá = xoá mềm,
// không xoá mẫu mặc định của loại; hoàn tác trong 24h. Hoàn tác tạo (TIP-028b) = xoá mềm mẫu khi chưa chứng từ nào dùng, trả mặc định nhóm
// về mẫu cũ. detect_fields gọi model trong `prepare` (ngoài transaction).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, legalChecklist, type DocKind } from '@appchat/shared';
import type { ActionInput, docTemplateCreate, docTemplateDelete, docTemplateDetectFields, docTemplateUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { FilesService } from '../../kernel/files/files.service';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { actorUserId } from '../../crm/public';
import { AiRunner } from '../../ai/runs/runner';
import { trustedParent } from '../../ai/runs/run-lineage';
import { runOnce } from '../../ai/agents/agent.runtime';
import { detectByRules, detectPrompt, parseDetected, type DetectedField } from '../services/detect';
import { checkDocxFields, checkRich, docxParas, liveTemplate } from '../services/template-store';
import { checkContractKind, groupHasDefault, makeGroupDefault } from '../services/contract-template';
import { templateUsedBy } from '../services/template-usage';
import { createPreview, deletePreview, updatePreview } from './previews/doc-template.handlers.preview';

const need = <T>(v: T | null | undefined, what: string): T => {
  if (!v) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '028' }, `${what} chưa cấu hình`);
  return v;
};

@Injectable()
@ActionHandler('doc_template.create')
export class DocTemplateCreateHandler implements Handler<ActionInput<typeof docTemplateCreate>, { template_id: string }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(FilesService) private readonly files: FilesService | null,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof docTemplateCreate>, tx: TenantTx): Promise<HandlerOutcome<{ template_id: string }>> {
    const kind = input.kind as DocKind;
    const id = uuidv7(this.clock.now().getTime());
    let data: { bodyHtml?: string; docxFileId?: string; fieldMap: object; checklistResult: object };
    if (input.source === 'rich') {
      const r = checkRich(kind, input.body ?? '');
      data = { bodyHtml: r.body, fieldMap: [], checklistResult: r.checklist };
    } else {
      if (!input.file_id) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'required' });
      const paras = await docxParas(tx, need(this.files, 'FilesService'), input.file_id);
      const fields = (input.fields ?? []).map((f) => ({ placeholder: f.placeholder.trim(), variable: f.variable }));
      data = { docxFileId: input.file_id, fieldMap: fields, checklistResult: checkDocxFields(kind, paras, fields) };
      await tx.file.update({ where: { id: input.file_id }, data: { confirmed: true } });
    }
    const contractKind = checkContractKind(kind, input.contract_kind);
    await tx.docTemplate.create({ data: { id, kind, contractKind, name: input.name, source: input.source, ...data, updatedBy: actorUserId(ctx) } });
    // Nhóm (loại chứng từ + loại hợp đồng) chưa có mặc định → mẫu đầu tiên của nhóm thành mặc định.
    const first = !(await groupHasDefault(tx, kind, contractKind));
    const prevDefault = input.is_default || first ? await makeGroupDefault(tx, kind, contractKind, id) : null;
    return { result: { template_id: id }, before: { id, prevDefault }, after: { id, kind, source: input.source, contract_kind: contractKind } };
  }

  /**
   * Hoàn tác tạo mẫu: chứng từ đã chụp mẫu này (báo giá / hợp đồng / đề nghị / phiếu thu) → 409 HAS_DEPENDENCIES nêu loại chứng từ;
   * không thì xoá mềm, mặc định nhóm về mẫu cũ (còn sống). Mẫu là mặc định duy nhất của nhóm vẫn gỡ được — render báo `template_id:
   * missing` như trước khi tạo, không ngầm dùng mẫu nhóm khác.
   */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; prevDefault: string | null };
    await tx.$queryRaw`SELECT 1 FROM doc_template WHERE id = ${b.id}::uuid FOR UPDATE`;
    const t = await tx.docTemplate.findUnique({ where: { id: b.id } });
    if (!t || t.deletedAt) return;
    const used = await templateUsedBy(tx, t.id);
    if (used) throw new AppError('HAS_DEPENDENCIES', 409, { template_id: `used_by:${used}` });
    await tx.docTemplate.update({ where: { id: t.id }, data: { deletedAt: this.clock.now(), isDefault: false } });
    if (!t.isDefault || !b.prevDefault) return;
    const prev = await tx.docTemplate.findFirst({ where: { id: b.prevDefault, deletedAt: null } });
    if (prev) await makeGroupDefault(tx, t.kind as DocKind, prev.contractKind ?? null, prev.id);
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof docTemplateCreate>, tx: TenantTx) {
    return createPreview(tx, this.files, input);
  }
}

@Injectable()
@ActionHandler('doc_template.update')
export class DocTemplateUpdateHandler implements Handler<ActionInput<typeof docTemplateUpdate>, { template_id: string; version: number }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(FilesService) private readonly files: FilesService | null,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof docTemplateUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ template_id: string; version: number }>> {
    const t = await liveTemplate(tx, input.template_id);
    if (input.if_version !== undefined && input.if_version !== t.version) throw new AppError('STALE_VERSION', 409, { version: String(t.version) });
    const kind = t.kind as DocKind;
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (t.source === 'rich' && input.body !== undefined) {
      const r = checkRich(kind, input.body);
      Object.assign(patch, { bodyHtml: r.body, checklistResult: r.checklist });
    }
    if (t.source === 'docx' && input.fields !== undefined) {
      const paras = await docxParas(tx, need(this.files, 'FilesService'), t.docxFileId!);
      const fields = input.fields.map((f) => ({ placeholder: f.placeholder.trim(), variable: f.variable }));
      Object.assign(patch, { fieldMap: fields, checklistResult: checkDocxFields(kind, paras, fields) });
    }
    if (input.is_default === false && t.isDefault) throw new AppError('VALIDATION_FAILED', 422, { is_default: 'need_one_default' });
    if (input.contract_kind !== undefined) {
      const next = checkContractKind(kind, input.contract_kind);
      // Mẫu mặc định đổi nhóm sẽ để nhóm cũ không còn mặc định — chặn (đặt mẫu khác làm mặc định nhóm cũ trước).
      if (next !== (t.contractKind ?? null) && t.isDefault) throw new AppError('VALIDATION_FAILED', 422, { contract_kind: 'default_locked' });
      if (next !== (t.contractKind ?? null)) patch.contractKind = next;
    }
    const content = Object.keys(patch).length > 0;
    // Khoá lạc quan ở câu UPDATE (concurrency §1): đổi nội dung → version + 1.
    const n = await tx.docTemplate.updateMany({
      where: { id: t.id, version: t.version, deletedAt: null },
      data: { ...patch, ...(content ? { version: { increment: 1 } } : {}), updatedBy: actorUserId(ctx), updatedAt: this.clock.now() },
    });
    if (!n.count) throw new AppError('STALE_VERSION', 409);
    const group = patch.contractKind !== undefined ? (patch.contractKind as string | null) : (t.contractKind ?? null);
    const prevDefault = input.is_default ? await makeGroupDefault(tx, kind, group, t.id) : null;
    const version = t.version + (content ? 1 : 0);
    return {
      result: { template_id: t.id, version },
      before: { id: t.id, name: t.name, bodyHtml: t.bodyHtml, fieldMap: t.fieldMap, checklistResult: t.checklistResult, version: t.version, isDefault: t.isDefault, prevDefault, contractKind: t.contractKind ?? null },
      after: { id: t.id, version },
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; name: string; bodyHtml: string | null; fieldMap: object; checklistResult: object; version: number; isDefault: boolean; prevDefault: string | null; contractKind?: string | null };
    const t = await tx.docTemplate.findUnique({ where: { id: b.id } });
    if (!t || t.deletedAt) throw new AppError('CONFLICT', 409, { template_id: 'deleted' });
    if (b.prevDefault) {
      const prev = await tx.docTemplate.findFirst({ where: { id: b.prevDefault, deletedAt: null } });
      // Khoá nhóm mặc định (unique partial): đặt lại mẫu cũ của đúng nhóm — không bao giờ để hai mặc định.
      if (prev) await makeGroupDefault(tx, t.kind as DocKind, prev.contractKind ?? null, prev.id);
    }
    // Hoàn tác nội dung = một phiên bản mới mang nội dung cũ (chứng từ đã phát hành giữ bản PDF đóng băng — templates.md §7).
    const regroup = b.contractKind !== undefined && b.contractKind !== (t.contractKind ?? null) && !t.isDefault ? { contractKind: b.contractKind } : {};
    await tx.docTemplate.update({ where: { id: b.id }, data: { name: b.name, bodyHtml: b.bodyHtml, fieldMap: b.fieldMap, checklistResult: b.checklistResult, ...regroup, version: { increment: 1 } } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof docTemplateUpdate>, tx: TenantTx) {
    return updatePreview(tx, this.files, input);
  }
}

@Injectable()
@ActionHandler('doc_template.delete')
export class DocTemplateDeleteHandler implements Handler<ActionInput<typeof docTemplateDelete>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof docTemplateDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const t = await liveTemplate(tx, input.template_id);
    if (t.isDefault) throw new AppError('CONFLICT', 409, { template_id: 'is_default' });
    await tx.docTemplate.update({ where: { id: t.id }, data: { deletedAt: this.clock.now() } });
    return { result: { ok: true }, before: { id: t.id, kind: t.kind, name: t.name } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof docTemplateDelete>, tx: TenantTx) {
    return deletePreview(tx, input);
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string };
    await tx.docTemplate.update({ where: { id: b.id }, data: { deletedAt: null } });
  }
}

type Detected = { fields: DetectedField[]; checklist: { key: string; ok: boolean }[] };

@Injectable()
@ActionHandler('doc_template.detect_fields')
export class DocTemplateDetectHandler implements Handler<ActionInput<typeof docTemplateDetectFields>, Detected> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(FilesService) private readonly files: FilesService | null,
    @Optional() @Inject(AiRunner) private readonly runner: AiRunner | null,
  ) {}

  async prepare(ctx: ActionContext, input: ActionInput<typeof docTemplateDetectFields>): Promise<Detected> {
    const kind = input.kind as DocKind;
    const db = await need(this.tenants, 'Tenant DB').get(TenantContexts.system(ctx.workspaceId, 'doc.detect'));
    const paras = await docxParas(db, need(this.files, 'FilesService'), input.file_id);
    if (!paras.length) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'empty' });
    let fields: DetectedField[] | null = null;
    if (this.runner) {
      const p = detectPrompt(kind, paras);
      const r = await runOnce(db, this.runner, () => this.clock.now(), ctx.workspaceId, {
        run: { kind: 'assistant', title: 'doc_template.detect_fields', tier: 'standard', initiatedByUserId: actorUserId(ctx) },
        parent: await trustedParent(db, ctx, 'doc_template.detect_fields'),
        system: p.system,
        prompt: p.prompt,
        source: 'assistant',
      });
      fields = r.status === 'completed' ? parseDetected(kind, paras, r.text) : null;
    }
    // Model không ra kết quả dùng được (hết credit, lỗi, sai định dạng) → bộ luật miễn phí; vẫn qua bước người xác nhận.
    fields ??= detectByRules(kind, paras);
    return { fields, checklist: legalChecklist(kind, paras.join('\n'), fields.map((f) => f.variable)) };
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<Detected>> {
    return { result: prepared as Detected };
  }
}
