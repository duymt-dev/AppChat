// Gom handler theo id lúc boot: mọi action trong packages/actions phải có handler (thật hoặc NOT_IMPLEMENTED có TIP chủ);
// handler cho id lạ hoặc trùng id → boot fail (action-registry §2).
import { AppError } from '@appchat/shared';
import { registry as ACTIONS, type ActionDef } from '@appchat/actions';
import { actionIdOf, type ActionHandler } from './handler';
import { tipOwnerOf } from './tip-owners';

export class NotImplementedHandler implements ActionHandler {
  constructor(
    readonly actionId: string,
    readonly tip: string | null,
  ) {}

  async execute(): Promise<never> {
    throw new AppError('NOT_IMPLEMENTED', 501, this.tip ? { tip: this.tip } : undefined, `${this.actionId} chưa cài (TIP-${this.tip ?? '?'})`);
  }
}

export class ActionHandlerRegistry {
  private readonly map = new Map<string, ActionHandler>();
  readonly implemented: string[] = [];
  private loaded = false;

  constructor(private readonly registry: readonly ActionDef[]) {}

  /** Registry đầy đủ của packages/actions (như ActionsModule lúc boot) — test composition app không import gói actions. */
  static full(): ActionHandlerRegistry {
    return new ActionHandlerRegistry(ACTIONS);
  }

  /** Gọi một lần lúc boot với mọi provider có @ActionHandler; lỗi → boot fail. */
  load(handlers: object[]): this {
    if (this.loaded) throw new Error('ActionHandlerRegistry đã load');
    const known = new Set(this.registry.map((a) => a.id));
    for (const h of handlers) {
      const id = actionIdOf(h.constructor);
      if (!id) throw new Error(`${h.constructor.name} thiếu @ActionHandler(id)`);
      if (!known.has(id)) throw new Error(`Handler cho action không có trong registry: ${id}`);
      if (this.map.has(id)) throw new Error(`Trùng handler cho action: ${id}`);
      this.map.set(id, h as ActionHandler);
      this.implemented.push(id);
    }
    for (const a of this.registry) {
      if (this.map.has(a.id)) continue;
      const tip = tipOwnerOf(a.id);
      if (!tip) throw new Error(`Action không có handler và không có TIP chủ: ${a.id}`);
      this.map.set(a.id, new NotImplementedHandler(a.id, tip));
    }
    this.loaded = true;
    return this;
  }

  /**
   * Action có handler thật — Trợ lý / agent chỉ thấy và gọi được các action này (TIP-023b R1.2). Chưa load → false (fail closed);
   * `get` vẫn trả NotImplementedHandler cho action còn thiếu nên không dùng `get` / `has` để kiểm.
   */
  isImplemented(id: string): boolean {
    if (!this.loaded) return false;
    const h = this.map.get(id);
    return !!h && !(h instanceof NotImplementedHandler);
  }

  get(id: string): ActionHandler | undefined {
    return this.map.get(id);
  }

  /** Danh sách action còn NOT_IMPLEMENTED theo TIP — dùng cho test DoD "không còn NOT_IMPLEMENTED của TIP X". */
  pendingByTip(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [id, h] of this.map) if (h instanceof NotImplementedHandler) (out[h.tip ?? '?'] ??= []).push(id);
    return out;
  }
}
