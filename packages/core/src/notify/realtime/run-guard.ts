// Ai còn đọc được một run AI (TIP-019b §5.3, DC-380) — bộ lọc WS `run.step` / `run.done` tra lại quyền HIỆN TẠI mỗi lần phát (không tin
// owner trong payload). Bảng `ai_run` thuộc domain ai → AiModule đăng ký guard; chưa có guard thì không ai nhận (thu hẹp).
import type { AuthzContext } from '@appchat/shared';

export type RunGuard = (input: { workspaceId: string; userId: string; authz: AuthzContext; runId: string }) => Promise<boolean>;

let guard: RunGuard | null = null;

export const registerRunGuard = (g: RunGuard | null) => void (guard = g);
export const runGuard = (): RunGuard | null => guard;
