// pnpm --filter @appchat/db db:migrate-tenants [--test] — áp migration tenant còn thiếu cho MỌI workspace `active | suspended` của DB nền
// tảng (tenantMigrate: song song 4, ghi tenant_migration, DB lỗi không chặn DB khác) + migration platform còn thiếu. Dùng sau khi merge
// TIP có migration mới cho demo / dev (trước đây áp tay từng DB). `--test` → DB nền tảng test (DC-358). Template do `db:setup` lo.
import {
  PLATFORM_MIGRATIONS_DIR,
  PlatformMigrationRecorder,
  PrismaWorkspaceRegistry,
  applyMigrations,
  createPlatformDb,
  readMigrations,
  tenantMigrate,
  testDbEnv,
} from '../src';

if (process.env.NODE_ENV === 'production')
  throw new Error('Production chạy tenant-migrate qua quy trình deploy (TIP-045), không qua script dev');
const env = process.argv.includes('--test') ? { ...process.env, ...testDbEnv(process.env) } : process.env;
for (const k of ['PLATFORM_DATABASE_URL', 'MIGRATOR_DATABASE_URL'] as const)
  if (!env[k]) throw new Error(`Thiếu ${k} — chạy \`pnpm --filter @appchat/db db:setup\` trước`);

const say = (s: string) => process.stdout.write(`${s}\n`);
const platformDone = await applyMigrations(
  env.MIGRATOR_DATABASE_URL!,
  readMigrations(PLATFORM_MIGRATIONS_DIR),
);
const platform = createPlatformDb(env.PLATFORM_DATABASE_URL!);
try {
  const r = await tenantMigrate({
    registry: new PrismaWorkspaceRegistry(platform),
    recorder: new PlatformMigrationRecorder(platform),
    migratorUrl: env.MIGRATOR_DATABASE_URL!,
  });
  say(
    `platform +${platformDone.length} migration · tenant ${r.version ?? '—'}: ${r.done.length} DB xong, ${r.failed.length} lỗi`,
  );
  for (const f of r.failed) say(`  ✖ ${f.workspaceId}: ${f.error.split('\n')[0]!.slice(0, 200)}`);
  process.exitCode = r.failed.length ? 1 : 0;
} finally {
  await platform.$disconnect();
}
