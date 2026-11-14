// Logger pino JSON: che PII theo REDACT_KEYS, tự gắn traceId / source / ws… từ RequestContext (ops §1).
import { pino, type DestinationStream, type Logger } from 'pino';
import { REDACT_CENSOR, redactPaths } from '@appchat/shared';
import { RequestContext } from '../request-context';

export type AppLogger = Logger;

export interface LoggerOptions {
  level?: string;
  service?: string;
  /** Cho test bắt output; mặc định stdout. */
  destination?: DestinationStream;
}

export function createLogger(opts: LoggerOptions = {}): AppLogger {
  return pino(
    {
      level: opts.level ?? 'info',
      base: opts.service ? { service: opts.service } : null,
      timestamp: pino.stdTimeFunctions.isoTime,
      messageKey: 'msg',
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: redactPaths(), censor: REDACT_CENSOR },
      mixin: () => ({ ...(RequestContext.get() ?? {}) }),
    },
    opts.destination,
  );
}
