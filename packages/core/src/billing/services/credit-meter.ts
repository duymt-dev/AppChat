// CreditMeter (Blueprint §5.1 Usage): mỗi bước LLM → credit theo đơn giá model → trừ ví ở DB nền tảng, idempotent theo
// `(ws, 'ai_step', runId:stepIdx)`; người gọi ghi `ai_run_step.credits` ở DB tenant SAU khi charge thành công.
// Đơn giá (`model_price`) thuộc TIP-019 → port PriceBook; TIP-009 cài StaticPriceBook (test / chưa có bảng giá).
import { AppError, creditsFor } from '@appchat/shared';
import type { WalletChange, WalletService } from './wallet.service';

export interface ModelPrice {
  per1kIn: number;
  per1kOut: number;
}

export interface PriceBook {
  /** null = model chưa có giá → không cho chạy (MODEL_PRICE_MISSING ghi ở fields). */
  price(provider: string, model: string): Promise<ModelPrice | null>;
}

export const PRICE_BOOK = Symbol('PRICE_BOOK');

export class StaticPriceBook implements PriceBook {
  constructor(private readonly prices: Record<string, ModelPrice> = {}) {}
  async price(provider: string, model: string): Promise<ModelPrice | null> {
    return this.prices[`${provider}:${model}`] ?? this.prices['*'] ?? null;
  }
}

export interface UsageInput {
  workspaceId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  runId: string;
  stepIdx: number;
  /** Khoá nguồn hiển thị trong lịch sử ví (assistant, inbox, marketing…). */
  source?: string;
}

export class CreditMeter {
  constructor(
    private readonly wallet: Pick<WalletService, 'charge' | 'assertBalance'>,
    private readonly prices: PriceBook,
  ) {}

  assertBalance(workspaceId: string): Promise<void> {
    return this.wallet.assertBalance(workspaceId);
  }

  async charge(u: UsageInput): Promise<{ credits: number; change: WalletChange }> {
    const p = await this.prices.price(u.provider, u.model);
    if (!p) throw new AppError('VALIDATION_FAILED', 400, { model: 'price_missing' }, `Chưa có đơn giá cho ${u.provider}:${u.model}`);
    const credits = creditsFor(u.tokensIn, u.tokensOut, p);
    const change = await this.wallet.charge(u.workspaceId, credits, {
      refType: 'ai_step',
      refId: `${u.runId}:${u.stepIdx}`,
      note: 'ai_usage',
      meta: { tokens: u.tokensIn + u.tokensOut },
      source: u.source ?? 'ai',
      provider: u.provider,
      model: u.model,
      tokensIn: u.tokensIn,
      tokensOut: u.tokensOut,
      runId: u.runId,
    });
    return { credits, change };
  }
}
