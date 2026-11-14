// Khung xương cây GenUI lên luồng lượt (TIP-023c 6a): input tool `render` đến dần → TreeSkeletonStream (packages/ai, parse JSON dở của
// SDK) → `ui_skeleton` chỉ khi hình đổi. Mỗi tool call một bộ ghép; ghi theo thứ tự (chuỗi promise) để không trộn với delta. Khung xương
// không có chữ / ref / nút — cây thật (`ui`) chỉ phát sau khi render.ts kiểm toàn cây.
import { TreeSkeletonStream } from '@appchat/ai';
import type { RunStream } from './stream';

export class SkeletonFeed {
  private readonly calls = new Map<string, TreeSkeletonStream>();
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly live: Pick<RunStream, 'emit'>) {}

  push(callId: string, delta: string): void {
    let s = this.calls.get(callId);
    if (!s) this.calls.set(callId, (s = new TreeSkeletonStream()));
    const feed = s;
    this.chain = this.chain
      .then(async () => {
        const sk = await feed.push(delta);
        if (sk) await this.live.emit({ type: 'ui_skeleton', call_id: callId.slice(0, 80), root: sk.root, blocks: sk.blocks });
      })
      .catch(() => undefined);
  }

  /** Chờ khung xương đang ghi xong trước khi phát phần còn lại của lượt. */
  settle(): Promise<unknown> {
    return this.chain;
  }
}
