// LRU nhỏ cho client tenant: giới hạn số client mở + đóng client idle (Blueprint §2.0: 100 DB, idle > 10 phút).
export interface LruOptions<V> {
  max: number;
  idleMs: number;
  now?: () => number;
  onEvict: (key: string, value: V) => void | Promise<void>;
}

export class IdleLru<V> {
  private readonly map = new Map<string, { value: V; usedAt: number }>();
  private readonly now: () => number;

  constructor(private readonly opts: LruOptions<V>) {
    this.now = opts.now ?? Date.now;
  }

  get size(): number {
    return this.map.size;
  }

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    this.map.delete(key);
    e.usedAt = this.now();
    this.map.set(key, e);
    return e.value;
  }

  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, { value, usedAt: this.now() });
    while (this.map.size > this.opts.max) {
      const [oldest] = this.map.keys();
      this.evict(oldest!);
    }
  }

  /** Đóng client không dùng quá idleMs; gọi định kỳ (timer của resolver). Trả số client đã đóng. */
  sweep(): number {
    const limit = this.now() - this.opts.idleMs;
    let n = 0;
    for (const [k, e] of [...this.map]) {
      if (e.usedAt <= limit) {
        this.evict(k);
        n++;
      }
    }
    return n;
  }

  delete(key: string): void {
    if (this.map.has(key)) this.evict(key);
  }

  async clear(): Promise<void> {
    const all = [...this.map];
    this.map.clear();
    await Promise.all(all.map(([k, e]) => this.opts.onEvict(k, e.value)));
  }

  private evict(key: string): void {
    const e = this.map.get(key);
    this.map.delete(key);
    if (e) void this.opts.onEvict(key, e.value);
  }
}
