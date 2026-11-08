// Queue `ai-task` (worker ROLE=ai — Blueprint §1.3, §5.4): một job = một lần chạy tác vụ. Người đẩy: `ai_task.create` (chạy ngay) /
// `ai_task.run_now`, job lịch `ai-task-scheduler` (tác vụ tới giờ), consumer sự kiện (ROLE=jobs). Job id theo lần chạy → đẩy trùng
// (job lịch chạy lại, sự kiện giao lại) không chạy hai lần. Run `queued` được tạo trước khi đẩy để màn "đang điều phối" thấy ngay.
import { Queue } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';

export const AI_TASK_QUEUE = 'ai-task';
/** Tập workspace có thể có tác vụ theo lịch — job lịch chỉ mở DB các workspace này (không quét mọi tenant mỗi phút). */
export const TASK_ARMED_KEY = 'ai-task:armed';

export interface TaskJob {
  ws: string;
  task_id: string;
  /** Run `queued` đã tạo cho lần chạy này. */
  run_id: string;
  /**
   * Sự kiện kích hoạt (tác vụ theo sự kiện). TIP-012b P4: chỉ topic + id outbox nguồn — runTask đọc lại payload từ `outbox_event` (không
   * mang dữ liệu / quyền qua queue). `payload` giữ cho job cũ còn trong hàng đợi lúc nâng cấp.
   */
  event?: { topic: string; source_event_id?: string; payload?: Record<string, unknown> };
}

export class TaskQueue {
  private readonly q: Queue<TaskJob>;

  constructor(private readonly redis: Redis) {
    this.q = new Queue<TaskJob>(AI_TASK_QUEUE, { connection: redis.duplicate() });
  }

  /** Đánh dấu workspace vừa đổi tác vụ (tạo / sửa / bật / hoàn tác) — job lịch xét lại; workspace hết tác vụ lịch tự bị gỡ. */
  async arm(ws: string): Promise<void> {
    await this.redis.sadd(TASK_ARMED_KEY, ws);
  }

  async push(job: TaskJob): Promise<void> {
    await this.q.add('run', job, { jobId: `task-${job.run_id}`, attempts: 1, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  close(): Promise<void> {
    return this.q.close();
  }
}

export const TASK_QUEUE = Symbol('TASK_QUEUE');
