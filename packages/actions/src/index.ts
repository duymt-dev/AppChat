import type { ActionDef } from './define';
import * as identity from './identity';
import * as onboarding from './onboarding';

export * from './define';
export * from './identity';
export * from './onboarding';

/** Registry dùng chung web / core / ai. Domain mới: thêm file `<domain>.ts` rồi spread vào đây. */
// Mỗi file domain chỉ export ActionDef — schema dùng chung đặt trong file riêng, không export từ file domain.
export const registry: readonly ActionDef[] = [...Object.values(identity), ...Object.values(onboarding)] as ActionDef[];

export const getAction = (id: string): ActionDef | undefined => registry.find((a) => a.id === id);
