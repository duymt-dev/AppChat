// Provider của tác vụ tự chủ (TIP-035) gắn vào AiModule: handler `ai_task.*`, TaskPlace, consumer sự kiện, queue `ai-task` (thiếu Redis
// → null: tạo / sửa vẫn chạy, lượt chạy ngay chỉ tạo run `queued` mà không đẩy được).
import type { Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../../kernel/redis';
import { TaskPlace } from './task-place';
import { AiTaskCreateHandler, AiTaskDeleteHandler, AiTaskPauseHandler, AiTaskRunNowHandler, AiTaskUpdateHandler } from './task.handlers';
import { TASK_QUEUE, TaskQueue } from './task.queue';
import { TaskEventsInstaller } from './task.jobs';

export const TASK_PROVIDERS: Provider[] = [
  TaskPlace,
  { provide: TASK_QUEUE, inject: [{ token: REDIS, optional: true }], useFactory: (r?: Redis) => (r ? new TaskQueue(r) : null) },
  AiTaskCreateHandler,
  AiTaskUpdateHandler,
  AiTaskPauseHandler,
  AiTaskDeleteHandler,
  AiTaskRunNowHandler,
  TaskEventsInstaller,
];
export const TASK_EXPORTS = [TaskPlace, TASK_QUEUE];
