// Bề mặt công khai của domain `ai` (TIP-019) cho apps (controller api, worker) và domain khác (TIP 020–023, 035, 043).
export { AI_ENV, AGENT_ENGINE } from './ai.module';
export { readAiEnv, type AiEnv } from './ai.env';
export { ProviderStore } from './router/provider.store';
export { RunStore, type NewRun } from './runs/run.store';
export { AiRunner, MAX_STEPS, DEFAULT_RUN_BUDGET, type RunSpec, type RunResult } from './runs/runner';
export { actionTool, toolActionId, inputSchemaOf, toolNameOf } from './runs/tools';
export { AI_CANCEL_CHANNEL, listRuns, publishCancel, type RunFilter, type RunRowDto } from './runs/runs.service';
export { aiSettingsDto, readAiSetting, tierFor, DEFAULT_RATE_LIMIT, type AiSettingRow } from './settings/ai-settings.service';
export { KB_EMBEDDER, KbSearchHandler, kbVisibility } from './kb/kb-search.handler';
export { KbIngestQueue } from './kb/kb.queue';
export { KB_INGEST_QUEUE, ingestSource, type IngestDeps, type IngestOutcome, type KbIngestJob } from './kb/ingest';
export { searchKb, minScoreOf, KB_CONTEXT, KB_TOP_K, DEFAULT_MIN_SCORE, type KbHit, type KbSearchInput, type KbSearchResult } from './kb/search';
export { readKb, fmtSize, KB_NAV, type KbDataDto } from './kb/kb.read';
export { ParseError, csvBlocks, htmlBlocks, kindOf, markdownBlocks, parseDocument } from './kb/parse';
export { AI_RUNTIME } from './jobs/ai.jobs.module';
