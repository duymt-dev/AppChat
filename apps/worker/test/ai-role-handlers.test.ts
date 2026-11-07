// TIP-023b: worker ROLE=ai dựng từ module production (KernelModule + AiRoleModule) phải có handler thật cho mọi action của TIP đã làm — như
// API — để `ai-resume` / agent / tác vụ không gặp 501. Không mock HandlerRegistry: dựng đồ thị DI thật ở chế độ preview (không khởi tạo
// provider, không lifecycle → không mở worker BullMQ, không kết nối DB / Redis), quét provider có @ActionHandler bằng DiscoveryService rồi
// nạp vào ActionHandlerRegistry thật (registry đầy đủ, TIP chủ) — đúng cách HandlerDiscovery của ActionsModule làm lúc boot.
import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ActionHandlerRegistry, KernelModule, actionIdOf } from '@appchat/core';
import { AiRoleModule } from '../src/roles/ai.module';

/** Env giả đủ để KernelModule nạp ActionsModule (DB + Redis + khoá) — chế độ preview không kết nối tới các URL này. */
const FAKE_ENV = {
  PLATFORM_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/appchat_fake',
  TENANT_DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/postgres',
  REDIS_URL: 'redis://127.0.0.1:1/15',
  APP_ENC_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  LOG_LEVEL: 'silent',
  AI_ENGINE: 'mock',
};

@Module({})
class AiRole {
  static forRoot(): DynamicModule {
    return { module: AiRole, imports: [KernelModule.forRoot(FAKE_ENV), AiRoleModule, DiscoveryModule] };
  }
}

/** TIP chưa làm (sau 023b): action của các TIP này còn NOT_IMPLEMENTED ở cả API. */
const LATER_TIPS = new Set(['036', '037', '038', '039', '040', '041', '042', '043', '044', '045', '046']);
/** Chuỗi agent / Trợ lý chạy tiếp sau duyệt (commerce + kênh) — phải có handler ở worker. */
const RESUME_PATH = ['quote.create', 'quote.send', 'order.create', 'contract.create', 'invoice.record_payment', 'invoice.send_payment_qr', 'appointment.create', 'appointment.update', 'ticket.create', 'contact.update', 'message.send', 'conversation.create_group'];

async function workerRegistry(): Promise<ActionHandlerRegistry> {
  const app = await NestFactory.createApplicationContext(AiRole.forRoot(), { logger: false, preview: true });
  try {
    // preview không khởi tạo provider: duyệt module đã quét của container (cùng đồ thị DiscoveryService dùng lúc boot thật).
    const container = (app as unknown as { container: { getModules(): Map<string, { providers: Map<unknown, { metatype: unknown }> }> } }).container;
    const types = new Set<new (...a: never[]) => object>();
    for (const m of container.getModules().values()) for (const w of m.providers.values()) if (typeof w.metatype === 'function' && actionIdOf(w.metatype)) types.add(w.metatype as new (...a: never[]) => object);
    // Đối tượng theo prototype (registry chỉ đọc constructor để lấy id action) → ActionHandlerRegistry thật với registry đầy đủ.
    return ActionHandlerRegistry.full().load([...types].map((t) => Object.create(t.prototype) as object));
  } finally {
    await app.close().catch(() => undefined);
  }
}

describe('worker ROLE=ai — handler domain như API', () => {
  it('chuỗi chạy tiếp commerce / kênh có handler thật; NOT_IMPLEMENTED chỉ còn ở TIP sau 023b', async () => {
    const r = await workerRegistry();
    for (const id of RESUME_PATH) expect(r.isImplemented(id), id).toBe(true);
    expect(Object.fromEntries(Object.entries(r.pendingByTip()).filter(([tip]) => !LATER_TIPS.has(tip)))).toEqual({});
  });
});
