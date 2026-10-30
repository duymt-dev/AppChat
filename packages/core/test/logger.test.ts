// TIP-001 AC4 + ops §5 "log không chứa SĐT / email / token": bắt output pino, kiểm che PII + trường ngữ cảnh.
import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { RequestContext, createLogger } from '../src/kernel';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];
  const destination = new Writable({
    write(chunk, _enc, cb) {
      const s = String(chunk);
      raw.push(s);
      lines.push(JSON.parse(s) as Record<string, unknown>);
      cb();
    },
  });
  return { log: createLogger({ level: 'debug', destination }), lines, raw };
}

const SECRETS = {
  phone: '0907711888',
  email: 'tram@example.vn',
  token: 'tok_SECRET_1',
  password: 'P@ssw0rd!',
  otp: '493817',
  credentials_enc: 'enc_SECRET_2',
  api_key: 'sk-SECRET-3',
};

describe('logger', () => {
  it('che khoá PII ở gốc, lồng 1 và 2 cấp', () => {
    const { log, raw } = capture();
    log.info(SECRETS, 'root');
    log.info({ contact: SECRETS }, 'nested1');
    log.info({ input: { contact: SECRETS } }, 'nested2');
    const out = raw.join('');
    for (const v of Object.values(SECRETS)) expect(out).not.toContain(v);
    expect(out).toContain('[redacted]');
  });

  it('che header authorization / cookie của request', () => {
    const { log, raw } = capture();
    log.info({ req: { headers: { authorization: 'Bearer abc.def', cookie: 'rt=xyz' } } }, 'req');
    expect(raw.join('')).not.toContain('abc.def');
    expect(raw.join('')).not.toContain('rt=xyz');
  });

  it('mỗi dòng có level chữ, time ISO, msg; ngoài request không có traceId', () => {
    const { log, lines } = capture();
    log.warn('plain');
    expect(lines[0]).toMatchObject({ level: 'warn', msg: 'plain' });
    expect(String(lines[0]!.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(lines[0]).not.toHaveProperty('traceId');
  });

  it('tự gắn traceId / source / ws / userId từ RequestContext', () => {
    const { log, lines } = capture();
    RequestContext.run({ traceId: 'tr-1', source: 'job', ws: 'ws_a', job: 'events' }, () => {
      RequestContext.patch({ userId: 'u_1' });
      log.info({ n: 1 }, 'in job');
    });
    expect(lines[0]).toMatchObject({ traceId: 'tr-1', source: 'job', ws: 'ws_a', job: 'events', userId: 'u_1', n: 1 });
  });
});
