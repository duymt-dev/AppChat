// Query key dạng [module, entity, params] (frontend-structure §4). `invalidates` của ActionDef trỏ vào phần tử đầu.
export const qk = {
  me: () => ['me'] as const,
  authz: () => ['me', 'authz'] as const,
  notifications: () => ['notifications'] as const,
  navBadges: () => ['nav', 'badges'] as const,
};

/** '*' → invalidate tất cả; còn lại so khớp phần tử đầu của query key. */
export const matchesInvalidation = (invalidates: readonly string[], key: readonly unknown[]): boolean =>
  invalidates.includes('*') || invalidates.includes(String(key[0]));
