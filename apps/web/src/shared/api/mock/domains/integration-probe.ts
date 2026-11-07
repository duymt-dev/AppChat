// Mock `integration.form_schema` / `integration.test` (TIP-023c G3, DEF-012-1) — cùng luật với core: trường theo connector, ô bí mật
// do registry quyết định (không do model), "Sắp có" → unsupported, khoá bắt đầu `bad` → failed (như MockBankFeedProvider). Không lưu.
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

/** Ô bí mật theo manifest backend (api_key của bank_feed / mail, password của smtp). */
const SECRET_KEYS = new Set(['api_key', 'password']);

const connector = (db: MockDb, key: string) => {
  const c = db.settingsApps.connectors.find((x) => x.key === key);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: key, fields: { provider: 'not_found' } });
  return c;
};

export const integrationProbeHandlers: Record<string, MockHandler> = {
  'integration.form_schema': {
    execute: (db, i: { provider: string }) => {
      const c = connector(db, i.provider);
      const soon = c.status === 'coming_soon';
      return {
        provider: c.key,
        name: c.name,
        status: soon ? 'coming_soon' : 'ga',
        auth_kind: c.key === 'smtp' ? 'basic' : 'api_key',
        fields: c.fields.map((key) => ({ key, secret: SECRET_KEYS.has(key), optional: false, type: 'string' as const })),
        testable: !soon && c.fields.length > 0,
      };
    },
  },
  'integration.test': {
    execute: (db, i: { provider: string; fields?: Record<string, string> }) => {
      const c = connector(db, i.provider);
      if (c.status === 'coming_soon') return { status: 'unsupported', reason: 'coming_soon' };
      if (!i.fields) return c.connected ? { status: 'ok' } : { status: 'not_connected' };
      const missing = c.fields.find((f) => !i.fields?.[f]?.trim());
      if (missing) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: missing, fields: { [missing]: 'required' } });
      return (i.fields.api_key ?? i.fields.password ?? '').startsWith('bad') ? { status: 'failed', reason: 'rejected' } : { status: 'ok' };
    },
  },
};
