// Helper đo ngân sách câu truy vấn SQL trên DB tenant thật (standards/code/testing.md §4b, TIP-003g): dùng trong integration
// test để kiểm chứng số câu SQL là O(1) — không phát sinh N+1 khi dữ liệu tăng 10 → 100 bản ghi (đếm trong WeakMap, gắn $on đúng 1 lần).

export interface QueryEvent {
  query: string;
  params?: string;
  duration?: number;
}

export interface QueryEventSource {
  $on(event: 'query', callback: (event: QueryEvent) => void): unknown;
}

export type QueryEventClient = QueryEventSource | { readonly $on: unknown };

const TX_CONTROL = /^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT\b|RELEASE\s+SAVEPOINT\b)/i;
const sinks = new WeakMap<object, Set<(q: string) => void>>();

function subscribe(prisma: QueryEventClient, fn: (q: string) => void): () => void {
  let set = sinks.get(prisma);
  if (!set) {
    set = new Set();
    sinks.set(prisma, set);
    (prisma as QueryEventSource).$on('query', (e) => {
      const q = e.query.trim();
      if (!q || TX_CONTROL.test(q)) return;
      for (const cb of set!) cb(q);
    });
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}

export async function countQueries<T>(
  prisma: QueryEventClient,
  fn: () => Promise<T>,
): Promise<{ result: T; count: number; queries: string[] }> {
  const queries: string[] = [];
  const off = subscribe(prisma, (q) => queries.push(q));
  try {
    const result = await fn();
    return { result, count: queries.length, queries };
  } finally {
    off();
  }
}
