// TIP-032d §1.2, §2.1: worker ROLE=ai dựng từ module production (KernelModule + AiRoleModule) có handler THẬT cho 6 action tệp đính kèm
// đơn / đề nghị (SalesModule) — agent / tác vụ gọi không gặp 501, đăng ký đúng một lần. Bundle kiểm cấu trúc cô lập đóng gói ở dist của
// worker (tsup entry `attachment-validator`, CJS tự chứa): tiến trình con `node --permission` chỉ đọc thư mục dist nạp được và kiểm đúng.
// Dựng đồ thị DI ở chế độ preview (không kết nối DB / Redis / BullMQ).
import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { actionIdOf, KernelModule, validateIsolated, validatorEntry } from '@appchat/core';
import { AiRoleModule } from '../../src/roles/ai.module';
import { badDocx, pdf } from '../../../../fixtures/contracts/files/build-fixtures';

const FAKE_ENV = {
  PLATFORM_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/appchat_fake',
  TENANT_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/postgres',
  REDIS_URL: 'redis://127.0.0.1:1/15',
  APP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  LOG_LEVEL: 'silent',
  AI_ENGINE: 'mock',
};
const WORKER = join(import.meta.dirname, '..', '..');
const IDS = ['order.file_attach', 'order.file_detach', 'order.files_list', 'invoice.file_attach', 'invoice.file_detach', 'invoice.files_list'];

@Module({})
class AiRole {
  static forRoot(): DynamicModule {
    return { module: AiRole, imports: [KernelModule.forRoot(FAKE_ENV), AiRoleModule, DiscoveryModule] };
  }
}

/** Mọi action id có handler trong đồ thị DI của ROLE=ai (mỗi id đếm số provider đăng ký). */
async function handlerCounts(): Promise<Map<string, number>> {
  const app = await NestFactory.createApplicationContext(AiRole.forRoot(), { logger: false, preview: true });
  try {
    const container = (app as unknown as { container: { getModules(): Map<string, { providers: Map<unknown, { metatype: unknown }> }> } }).container;
    const seen = new Set<unknown>();
    const out = new Map<string, number>();
    for (const m of container.getModules().values())
      for (const w of m.providers.values()) {
        const id = typeof w.metatype === 'function' ? actionIdOf(w.metatype) : undefined;
        if (!id || seen.has(w.metatype)) continue;
        seen.add(w.metatype);
        out.set(id, (out.get(id) ?? 0) + 1);
      }
    return out;
  } finally {
    await app.close().catch(() => undefined);
  }
}

describe('ROLE=ai — tệp đính kèm đơn / đề nghị', () => {
  it('6 action có đúng một handler mỗi action', async () => {
    const c = await handlerCounts();
    expect(Object.fromEntries(IDS.map((id) => [id, c.get(id)]))).toEqual(Object.fromEntries(IDS.map((id) => [id, 1])));
  });

  it('bundle validator của worker: cạnh entry dist, kiểm trong tiến trình con cô lập', async () => {
    execFileSync(process.execPath, [join(WORKER, 'node_modules', 'tsup', 'dist', 'cli-default.js'), '--silent'], { cwd: WORKER, stdio: 'ignore' });
    const entry = validatorEntry({}, join(WORKER, 'dist', 'main.js'));
    expect(entry).toBe(join(WORKER, 'dist', 'attachment-validator.cjs'));
    expect(await validateIsolated(entry, pdf({ text: 'worker' }), 'a.pdf')).toEqual({ ok: true, kind: 'pdf' });
    expect(await validateIsolated(entry, badDocx.macro(), 'm.docx')).toEqual({ ok: false, reason: 'macro' });
  }, 120_000);
});
