// Luồng sự kiện của lượt Trợ lý (TIP-023c 6a + SPEC vận hành): mỗi sự kiện GHI BỀN vào sổ (run, seq) rồi mới phát Redis pub/sub
// `appchat:assistant:run:<id>`; SSE subscribe theo run, nối lại từ cursor đã ký (replay từ sổ, sau đó nhận trực tiếp). Delta gộp ≤ 50ms để
// giảm số dòng sổ; frame ≤ 64KiB; trình duyệt đóng kết nối chỉ huỷ đăng ký, không huỷ run (Dừng = run.cancel).
import type { Redis } from 'ioredis';
import { GENUI_STREAM, type StreamEvent } from '@appchat/shared';
import type { EventStore } from './event-store';

export const runChannel = (runId: string) => `appchat:assistant:run:${runId}`;
const MAX_TEXT = Math.floor(GENUI_STREAM.frameBytes / 4);

export type Publisher = Pick<Redis, 'publish'>;

/** Ghi + phát sự kiện của một run; delta gộp theo cửa sổ 50ms. Không có sổ (test đơn vị) → chỉ bỏ qua. */
export class RunStream {
  private pending = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly runId: string,
    private readonly store: EventStore | null,
    private readonly pub: Publisher | null,
    /** Fence của lượt (sổ yêu cầu): false → tiến trình đã mất lease, không ghi / phát thêm (TIP-023c "Fenced recovery"). */
    private readonly guard: (() => Promise<boolean>) | null = null,
  ) {}

  private write(e: StreamEvent): Promise<unknown> {
    if (!this.store) return Promise.resolve();
    // Thứ tự ghi = thứ tự phát (seq tăng). Lỗi ghi không làm hỏng lượt (lịch sử tin vẫn là nguồn thật) — chỉ mất replay của sự kiện đó.
    this.chain = this.chain.then(async () => {
      if (this.guard && !(await this.guard())) return;
      const seq = await this.store!.append(this.runId, e);
      await this.pub?.publish(runChannel(this.runId), JSON.stringify({ seq, event: e }));
    }).catch(() => undefined);
    return this.chain;
  }

  delta(text: string): void {
    this.pending += text;
    if (this.pending.length >= MAX_TEXT) return void this.flush();
    this.timer ??= setTimeout(() => void this.flush(), GENUI_STREAM.coalesceMs);
  }

  flush(): Promise<unknown> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending) return this.chain;
    const text = this.pending;
    this.pending = '';
    return this.write({ type: 'delta', text });
  }

  /** Sự kiện rời rạc (ui / confirm / ui_command / result / error / done): đẩy delta còn chờ trước để giữ thứ tự. */
  async emit(e: StreamEvent): Promise<void> {
    await this.flush();
    await this.write(e);
  }

  async close(): Promise<void> {
    await this.flush();
    await this.chain;
  }
}
