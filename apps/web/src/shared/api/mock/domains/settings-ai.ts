// Mock Cài đặt › AI (Blueprint §3.4 ai, §5; D29): GET /settings/ai (mức AI theo tác vụ, ngân sách), /settings/kb?nav&folder&q (kho tri thức),
// /settings/governance (audit: domains/audit.ts — TIP-045b). Ghi qua ai_settings.update, kb.*, governance.update. TIP-020e: `index` (trạng thái
// chỉ mục embedding — domains/kb-index.ts).
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { assertEditable, inheritVisibility } from './kb-folders';
import { revokeAiDrafts } from './inbox-draft-ref';
import { readKbIndex } from './kb-index';
import inboxSeed from '../../../../../../../fixtures/prototype-parity/inbox.json';

const suggestionsSeed = inboxSeed.suggestions as Record<string, unknown>;

type Ai = typeof fixture.ai;
type Kb = typeof fixture.kb;
export type KbDoc = Kb['docs'][number];
type Gov = typeof fixture.governance;

export interface SettingsAiState {
  ai: Ai;
  kb: Kb;
  gov: Gov;
  trash: Record<string, { at: number; doc: KbDoc }>;
  seq: number;
}

export const createSettingsAiState = (): SettingsAiState => ({
  ai: structuredClone(fixture.ai),
  kb: structuredClone(fixture.kb),
  gov: structuredClone(fixture.governance),
  trash: {},
  seq: 0,
});

const CONV = 'conv';
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

const NAV: Record<string, (d: KbDoc) => boolean> = {
  learned: (d) => d.learned,
  conv: (d) => d.source === CONV,
  upload: (d) => d.source === 'upload',
  star: (d) => d.starred,
};

export const settingsAiRoutes: Record<string, MockRoute> = {
  '/settings/ai': (db) => db.settingsAi.ai,
  '/settings/kb': (db, p) => {
    const nav = String(p.nav ?? 'all');
    const folder = p.folder ? String(p.folder) : null;
    const q = fold(String(p.q ?? '').trim());
    const docs = db.settingsAi.kb.docs.filter(
      (d) => (NAV[nav]?.(d) ?? true) && (!folder || d.folder_id === folder) && (!q || fold(d.name).includes(q) || d.tags.some((t) => fold(t).includes(q))),
    );
    const { types, folders, nav: counts, learned_total, size } = db.settingsAi.kb;
    return { types, folders, nav: counts, learned_total, size, data: nav === 'trash' ? [] : docs, index: readKbIndex(db) };
  },
  '/settings/governance': (db) => db.settingsAi.gov,
};

const doc = (db: MockDb, id: string) => {
  const d = db.settingsAi.kb.docs.find((x) => x.id === id);
  if (!d) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return d;
};
const toggles = (list: { key: string; on: boolean }[], patch?: Record<string, boolean>) => {
  for (const [k, v] of Object.entries(patch ?? {})) {
    const row = list.find((x) => x.key === k);
    if (row) row.on = v;
  }
};

type GovIn = Partial<Omit<Gov, 'scopes' | 'bounds'>> & { scopes?: Record<string, boolean>; bounds?: Record<string, boolean> };

export const settingsAiHandlers: Record<string, MockHandler> = {
  'ai_settings.update': {
    execute: (db, i: { default_tier?: string; tasks?: Record<string, string>; budget?: number; rate_limit?: number }) => {
      const a = db.settingsAi.ai;
      const locked = a.tiers.filter((t) => t.locked).map((t) => t.key);
      const used = [i.default_tier, ...Object.values(i.tasks ?? {})].filter(Boolean) as string[];
      if (used.some((t) => locked.includes(t)))
        throw new ApiRequestError(403, { code: 'PLAN_LIMIT_REACHED', message: 'tier locked', fields: { tier: 'upgrade' } });
      if (i.default_tier) a.default_tier = i.default_tier;
      for (const [k, v] of Object.entries(i.tasks ?? {})) {
        const t = a.tasks.find((x) => x.key === k);
        if (t) t.tier = v;
      }
      if (i.budget !== undefined) a.budget = i.budget;
      if (i.rate_limit !== undefined) a.rate_limit = i.rate_limit;
      return { ok: true };
    },
  },
  'kb.add_source': {
    execute: (db, i: { name: string; folder_id?: string; tags?: string[]; learn?: boolean; visibility?: 'public' | 'internal' }) => {
      const id = `kb_n${++db.settingsAi.seq}`;
      const ext = i.name.split('.').pop()?.toLowerCase() ?? '';
      const type = ext in db.settingsAi.kb.types ? ext : ext === 'docx' ? 'doc' : ext === 'xlsx' ? 'xls' : ext === 'pptx' ? 'ppt' : 'pdf';
      db.settingsAi.kb.docs.unshift({
        id, name: i.name, type, tags: i.tags ?? [], learned: i.learn !== false, size: '—', source: 'upload', by: 'Bạn', date: today(),
        folder_id: i.folder_id ?? null, starred: false, visibility: inheritVisibility(db, i.visibility, i.folder_id),
      } as KbDoc);
      db.settingsAi.kb.nav.all += 1;
      db.settingsAi.kb.nav.upload += 1;
      return { source_id: id };
    },
  },
  'kb.remove_source': {
    execute: (db, i: { source_id: string }) => {
      const list = db.settingsAi.kb.docs;
      const d = doc(db, i.source_id);
      assertEditable(d as { origin?: string });
      const at = list.indexOf(d);
      db.settingsAi.trash[i.source_id] = { at, doc: list[at]! };
      list.splice(at, 1);
      db.settingsAi.kb.nav.trash += 1;
      return { ok: true };
    },
    undo: (db, i: { source_id: string }) => {
      const t = db.settingsAi.trash[i.source_id];
      if (t) db.settingsAi.kb.docs.splice(t.at, 0, t.doc);
      delete db.settingsAi.trash[i.source_id];
      db.settingsAi.kb.nav.trash -= 1;
    },
  },
  'kb.refresh_source': {
    execute: (db, i: { source_id: string }) => {
      const targets = i.source_id === 'all' ? db.settingsAi.kb.docs.filter((d) => d.type !== 'folder') : [doc(db, i.source_id)];
      for (const d of targets) d.learned = true;
      // TIP-020c: nạp lại nguồn → nháp / gợi ý AI đang hiện phụ thuộc nguồn hết hiệu lực (mock: mọi hội thoại có nháp / gợi ý).
      revokeAiDrafts(db, [...db.inbox.conversations.filter((c) => c.ai_draft).map((c) => c.id), ...Object.keys(suggestionsSeed)]);
      return { queued: targets.length };
    },
  },
  'governance.update': {
    execute: (db, i: GovIn) => {
      const g = db.settingsAi.gov;
      const { scopes, bounds, ...rest } = i;
      toggles(g.scopes, scopes);
      toggles(g.bounds, bounds);
      Object.assign(g, rest);
      return { ok: true };
    },
  },
};
