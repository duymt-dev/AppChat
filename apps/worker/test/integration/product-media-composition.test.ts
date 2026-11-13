// TIP-027b §1.3, §1.6: worker ROLE=ai dựng từ module production (KernelModule + AiRoleModule) có handler THẬT cho 5 action media sản
// phẩm (CatalogModule) — đăng ký đúng một lần. Bundle kiểm cấu trúc cô lập ĐÓNG GÓI ở dist của worker gọi `image-bounds` của kernel cho hồ
// sơ `product`: ảnh động / quá cỡ / SVG giả ảnh bị từ chối trong tiến trình con thật (không chỉ unit test helper). Preview DI, không DB.
import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { actionIdOf, KernelModule, validateIsolated, validatorEntry } from '@appchat/core';
import { AiRoleModule } from '../../src/roles/ai.module';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { jpegOf, pngOf, webpOf } from '../../../../fixtures/product-media/images';

const FAKE_ENV = {
  PLATFORM_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/appchat_fake',
  TENANT_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/postgres',
  REDIS_URL: 'redis://127.0.0.1:1/15',
  APP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  LOG_LEVEL: 'silent',
  AI_ENGINE: 'mock',
};
const WORKER = join(import.meta.dirname, '..', '..');
const IDS = ['product.media_attach', 'product.media_detach', 'product.media_reorder', 'product.media_set_primary', 'product.media_list'];

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

describe('ROLE=ai — media sản phẩm', () => {
  it('5 action có đúng một handler mỗi action', async () => {
    const c = await handlerCounts();
    expect(Object.fromEntries(IDS.map((id) => [id, c.get(id)]))).toEqual(Object.fromEntries(IDS.map((id) => [id, 1])));
  });

  it('bundle validator của worker, hồ sơ product: ảnh hợp lệ qua; ảnh động / quá cỡ / SVG giả ảnh bị từ chối trong tiến trình con', async () => {
    execFileSync(process.execPath, [join(WORKER, 'node_modules', 'tsup', 'dist', 'cli-default.js'), '--silent'], { cwd: WORKER, stdio: 'ignore' });
    const entry = validatorEntry({}, join(WORKER, 'dist', 'main.js'));
    const run = (b: Uint8Array, name: string) => validateIsolated(entry, Buffer.from(b), name, {}, 'product');
    expect(await run(pngOf(800, 600), 'a.png')).toEqual({ ok: true, kind: 'png' });
    expect(await run(jpegOf(1200, 900), 'a.jpg')).toEqual({ ok: true, kind: 'jpeg' });
    expect(await run(pdf({ text: 'hdsd' }), 'a.pdf')).toEqual({ ok: true, kind: 'pdf' });
    expect(await run(pngOf(10, 10, true), 'apng.png')).toEqual({ ok: false, reason: 'animated' });
    expect(await run(webpOf(20, 20, true), 'dong.webp')).toEqual({ ok: false, reason: 'animated' });
    expect(await run(pngOf(9000, 10), 'lon.png')).toEqual({ ok: false, reason: 'image_too_large' });
    expect(await run(jpegOf(7000, 7000), 'mp.jpg')).toEqual({ ok: false, reason: 'image_too_large' });
    expect(await run(new TextEncoder().encode('<svg onload="x()"></svg>'), 's.png')).toMatchObject({ ok: false });
    // Hồ sơ record (đơn / đề nghị — 032d) giữ luật cũ.
    expect(await validateIsolated(entry, Buffer.from(pngOf(9000, 10)), 'lon.png')).toEqual({ ok: true, kind: 'png' });
  }, 120_000);
});
