// Trừ ví cho usage AI theo biên nhận (TIP-019b §2.3): một ref sổ = một lần trừ. Gọi lại cùng ref → trả ĐÚNG số đã trừ lần đầu (đọc từ
// sổ), không định giá lại. Ví không đủ → CREDIT_EXHAUSTED (giữ luật cũ: trừ đủ hoặc không trừ, không âm, không nợ). `lookup` để khôi
// phục: tìm dòng sổ theo ref mà không trừ.
import type { PlatformDb } from '@appchat/db';
import type { WalletService } from './wallet.service';

export const AI_USAGE_REF = 'ai_step';

export interface UsageCharge {
  workspaceId: string;
  ref: string;
  credits: number;
  runId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  source: string;
}

export interface UsageChargeResult {
  /** Số credit thực trừ theo sổ (lần đầu hoặc lần gọi lại). */
  amount: number;
  ledgerId: string;
  /** false = ref đã có từ trước (không trừ thêm). */
  applied: boolean;
}

export class UsageWallet {
  constructor(
    private readonly wallet: Pick<WalletService, 'charge'>,
    private readonly platform: Pick<PlatformDb, 'creditLedger'>,
  ) {}

  async charge(u: UsageCharge): Promise<UsageChargeResult> {
    const c = await this.wallet.charge(u.workspaceId, u.credits, {
      refType: AI_USAGE_REF,
      refId: u.ref,
      note: 'ai_usage',
      meta: { tokens: u.tokensIn + u.tokensOut },
      source: u.source,
      provider: u.provider,
      model: u.model,
      tokensIn: u.tokensIn,
      tokensOut: u.tokensOut,
      runId: u.runId,
    });
    if (c.applied) return { amount: u.credits, ledgerId: c.ledgerId, applied: true };
    const prior = await this.lookup(u.workspaceId, u.ref);
    return { amount: prior?.amount ?? 0, ledgerId: c.ledgerId, applied: false };
  }

  async lookup(workspaceId: string, ref: string): Promise<{ amount: number; ledgerId: string } | null> {
    const row = await this.platform.creditLedger.findUnique({ where: { workspaceId_refType_refId: { workspaceId, refType: AI_USAGE_REF, refId: ref } }, select: { id: true, delta: true } });
    return row ? { amount: -Number(row.delta), ledgerId: row.id } : null;
  }
}
