// Ngữ cảnh mỗi request / job (AsyncLocalStorage): logger tự gắn các trường này vào mọi dòng log (ops §1.2).
import { AsyncLocalStorage } from 'node:async_hooks';

export type LogSource = 'http' | 'ws' | 'job' | 'webhook' | 'agent' | 'system';

export interface RequestContextData {
  traceId: string;
  source: LogSource;
  ws?: string;
  userId?: string;
  runId?: string;
  actionId?: string;
  conversationId?: string;
  job?: string;
}

const storage = new AsyncLocalStorage<RequestContextData>();

export const RequestContext = {
  run<T>(data: RequestContextData, fn: () => T): T {
    return storage.run({ ...data }, fn);
  },
  get(): RequestContextData | undefined {
    return storage.getStore();
  },
  /** Bổ sung trường khi biết thêm (vd. userId sau khi xác thực). */
  patch(fields: Partial<Omit<RequestContextData, 'traceId'>>): void {
    const cur = storage.getStore();
    if (cur) Object.assign(cur, fields);
  },
};

const TRACE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/** Header X-Request-Id hợp lệ thì dùng lại, không thì trả undefined để sinh mới. */
export function acceptTraceId(header: string | string[] | undefined): string | undefined {
  const v = Array.isArray(header) ? header[0] : header;
  return v && TRACE_ID.test(v) ? v : undefined;
}
