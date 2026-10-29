// Đưa prototype vào một state (chỉ dùng cho entry parity cần trạng thái không có nút trong DOM).
import type { Page } from '@playwright/test';

export const protoSetState = (p: Page, patch: Record<string, unknown>) =>
  p.evaluate((st) => {
    const el = document.querySelector('.appshell') as unknown as Record<string, unknown>;
    const key = Object.keys(el).find((x) => x.startsWith('__reactFiber'))!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let f: any = el[key];
    while (f && !(f.stateNode && f.stateNode.logic)) f = f.return;
    f.stateNode.logic.setState(st);
  }, patch);
