// Capability chung (TIP-003c §1.4) cho `contract.appendix_public_*`: nguồn = locator công khai (token phụ lục đã lưu). Verifier đọc lại
// token theo id — phải còn đúng phụ lục + version + digest đã niêm phong; capability hẹp của 030b (capability.ts) vẫn kiểm trong handler.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { SystemTrigger } from '../../kernel/actions/system';
import type { PublicAppendixAction } from './capability';

export const APPENDIX_SIGN_ACTOR = 'appendix.public_sign';

interface Token {
  id: string;
  appendixId: string;
  appendixVersion: number;
  documentHash: string;
  signerId: string;
}

export const appendixTrigger = (ws: string, action: PublicAppendixAction, t: Token, input: Record<string, unknown>): SystemTrigger => ({
  workspaceId: ws,
  actionId: action,
  sourceKind: 'public_locator',
  sourceRef: t.id,
  targetId: t.appendixId,
  generation: `${t.appendixVersion}:${t.documentHash}`,
  milestone: t.signerId,
  input,
  actor: APPENDIX_SIGN_ACTOR,
});

export async function verifyAppendixPublic(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const tok = await db.appendixSignToken.findUnique({ where: { id: t.sourceRef }, select: { appendixId: true, appendixVersion: true, documentHash: true, signerId: true } });
  if (!tok || tok.appendixId !== t.targetId || t.input.appendix_id !== t.targetId || tok.signerId !== t.milestone) throw new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });
  if (`${tok.appendixVersion}:${tok.documentHash}` !== t.generation) throw new AppError('SIGN_LINK_INVALID', 410, { token: 'invalid' });
}

export const APPENDIX_PUBLIC_ACTIONS: readonly PublicAppendixAction[] = ['contract.appendix_public_otp', 'contract.appendix_public_sign', 'contract.appendix_public_decline'];
