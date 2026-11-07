// Ai được vào phòng `conv:{id}` (Blueprint §4.6 `conv.join`): ngoài `inbox.view`, hội thoại phải trong data scope inbox của
// người đó. Bảng `conversation` thuộc TIP-016 → TIP-016 đăng ký guard; chưa có guard thì gateway trả NOT_IMPLEMENTED.
import type { AuthzContext } from '@appchat/shared';

export type ConversationGuard = (input: { workspaceId: string; userId: string; authz: AuthzContext; conversationId: string }) => Promise<boolean>;

let guard: ConversationGuard | null = null;

export function registerConversationGuard(g: ConversationGuard | null): void {
  guard = g;
}

export const conversationGuard = (): ConversationGuard | null => guard;
