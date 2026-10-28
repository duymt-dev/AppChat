import type { ActionDef } from './define';
import * as identity from './identity';

export * from './define';
export * from './identity';

/** Registry dùng chung web / core / ai. Domain mới: thêm file `<domain>.ts` rồi spread vào đây. */
export const registry: readonly ActionDef[] = [...Object.values(identity)];

export const getAction = (id: string): ActionDef | undefined => registry.find((a) => a.id === id);
