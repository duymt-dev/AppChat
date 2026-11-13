// Action từ điển gợi ý danh mục ticket (TIP-034b §1.3–1.5): `ticket_categories.get` / `.replace` (settings.manage, không cấp agent) và
// `ticket.category_suggestions` (ticket.view, kỹ năng AI đọc). Thay = cả bộ có thứ tự + CAS `if_version`; xem trước hiện trước / sau,
// thêm / bớt (đổi tên = bớt + thêm), đổi mặc định + cảnh báo "ticket cũ giữ nguyên". Một transaction: ghi + action_log + outbox
// `ticket_categories.changed` (chỉ key + version). Hoàn tác 24h chỉ khi version hiện tại = version sau lần sửa và người hoàn tác còn
// settings.manage — khôi phục nguyên bộ trước (lần sửa đầu → 8 nhãn prototype ở version MỚI, không xoá dòng), version tăng tiếp.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CATEGORY_CONFIG_KEY, categoryFieldErrors, diffCategoryLabels, isValidCategoryConfig, validateCategoryLabels, type AuthzContext } from '@appchat/shared';
import type { ActionInput, ActionPreview, ticketCategoriesGet, ticketCategoriesReplace, ticketCategorySuggestions } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { CategoryCursors, categorySuggestions } from './read';
import { configDto, readCategoryConfig, writeCategoryConfig } from './repository';

type ReplaceIn = ActionInput<typeof ticketCategoriesReplace>;
type ConfigOut = { version: number; labels: string[]; default: string };
type Snapshot = { version: number; labels: string[] };

export const EXISTING_UNCHANGED = 'existing_tickets_unchanged';

const changed = (version: number) => ({ topic: 'ticket_categories.changed', payload: { key: CATEGORY_CONFIG_KEY, version } });
const byOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
const canManage = (a: AuthzContext) => a.isOwner || a.permissions.has('settings.manage');

/** Chuẩn hoá + kiểm bộ nhãn (validator dùng chung); lỗi → 422 theo field `labels.<i>` / `labels`. */
function validLabels(raw: readonly string[]): string[] {
  const v = validateCategoryLabels(raw);
  if (!isValidCategoryConfig(v)) throw new AppError('VALIDATION_FAILED', 422, categoryFieldErrors(v));
  return v.labels;
}

const assertVersion = (cur: number, want: number) => {
  if (cur !== want) throw new AppError('STALE_VERSION', 409, { version: String(cur) });
};

@Injectable()
@ActionHandler('ticket_categories.get')
export class TicketCategoriesGetHandler implements Handler<ActionInput<typeof ticketCategoriesGet>, ConfigOut> {
  async execute(_ctx: ActionContext, _i: unknown, tx: TenantTx): Promise<HandlerOutcome<ConfigOut>> {
    return { result: configDto(await readCategoryConfig(tx)) };
  }
}

@Injectable()
@ActionHandler('ticket_categories.replace')
export class TicketCategoriesReplaceHandler implements Handler<ReplaceIn, ConfigOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, i: ReplaceIn, tx: TenantTx): Promise<ActionPreview> {
    const labels = validLabels(i.labels);
    const cur = await readCategoryConfig(tx);
    assertVersion(cur.version, i.if_version);
    const d = diffCategoryLabels(cur.labels, labels);
    return preview('config', line(labels[0], labels.length), {
      count: labels.length,
      changes: [
        {
          entity: 'ticket_category_config',
          id: CATEGORY_CONFIG_KEY,
          before: { labels: cur.labels, default: cur.labels[0] ?? '', version: cur.version },
          after: { labels, default: labels[0], added: d.added, removed: d.removed, reordered: d.reordered, default_changed: d.default_changed },
        },
      ],
      warnings: [EXISTING_UNCHANGED],
    });
  }

  async execute(ctx: ActionContext, i: ReplaceIn, tx: TenantTx): Promise<HandlerOutcome<ConfigOut>> {
    const labels = validLabels(i.labels);
    const cur = await readCategoryConfig(tx, true);
    assertVersion(cur.version, i.if_version);
    const version = await writeCategoryConfig(tx, cur.version, labels, byOf(ctx), this.clock.now());
    const before: Snapshot = { version: cur.version, labels: cur.labels };
    const after: Snapshot = { version, labels };
    return { result: { version, labels, default: labels[0]! }, before, after, events: [changed(version)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    if (!canManage(ctx.authz)) throw new AppError('FORBIDDEN', 403, { permission: 'settings.manage' });
    const b = log.before as Snapshot;
    const a = log.after as Snapshot;
    const cur = await readCategoryConfig(tx, true);
    // Đã có lần sửa sau (tay / tệp / Trợ lý) → không ghi đè.
    assertVersion(cur.version, a.version);
    const now = this.clock.now();
    const version = await writeCategoryConfig(tx, cur.version, b.labels, byOf(ctx), now);
    await writeOutbox(tx, ctx.workspaceId, [changed(version)], now);
  }
}

@Injectable()
@ActionHandler('ticket.category_suggestions')
export class TicketCategorySuggestionsHandler implements Handler<ActionInput<typeof ticketCategorySuggestions>, unknown> {
  constructor(@Inject(CategoryCursors) private readonly cursors: CategoryCursors) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof ticketCategorySuggestions>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const s = await categorySuggestions(tx, ctx.workspaceId, ctx.authz, this.cursors, i.cursor);
    return { result: { config: { version: s.config.version, labels: s.config.labels, default: s.config.default }, used: s.used, next_cursor: s.next_cursor } };
  }
}
