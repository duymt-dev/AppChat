// TIP-045b annex A1 — phân loại handler action nền tảng: mọi action `db: 'platform'` có handler thật thuộc một lớp đã khai (nền tảng thuần
// + biên nhận tenant, hoặc giữ chỗ hạn mức + hiệu ứng tenant qua applyTenant); pha nền tảng chỉ được ĐỌC tenant (proxy chặn ghi); không
// còn handler nào ghi tenant trực tiếp trong pha nền tảng. wallet.update_alerts có handler từ TIP-039 (hết stub).
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { readOnlyTenant } from '../src/kernel/consistency/handler-adapter';
import { tipOwnerOf } from '../src/kernel/actions/tip-owners';

const PLATFORM = registry.filter((a) => a.db === 'platform').map((a) => a.id).sort();

/** Lớp đã duyệt (README kernel/consistency). Thêm action nền tảng mới phải xếp lớp ở đây. */
const CLASSES: Record<string, 'platform_only' | 'tenant_effect' | 'read' | 'stub'> = {
  'agent.create': 'tenant_effect',
  'agent.create_and_publish': 'tenant_effect',
  'channel.zalo.start_login': 'tenant_effect',
  'channel.email.connect': 'tenant_effect',
  'webchat.update_widget': 'tenant_effect',
  'bank_feed.connect': 'tenant_effect',
  'bank_feed.disconnect': 'tenant_effect',
  'member.search': 'read',
};
const platformOnly = ['admin.agent_template.upsert', 'admin.bank_transaction.match', 'admin.invoice.confirm_transfer', 'admin.llm_provider.disable', 'admin.llm_provider.probe', 'admin.llm_provider.upsert', 'admin.model_price.upsert', 'admin.model_route.upsert', 'admin.plan.upsert', 'admin.workspace.resume', 'admin.workspace.suspend', 'billing.apply_invoice', 'billing.cancel_invoice', 'billing.contact_sales', 'billing.create_invoice', 'billing.lifecycle_step', 'billing.report_transfer', 'business_profile.update', 'integration.register_interest', 'invite.revoke', 'member.invite', 'member.remove', 'member.set_role', 'notification.update_prefs', 'onboarding.toggle_step', 'profile.update', 'working_hours.update', 'workspace.request_transfer_otp', 'workspace.switch', 'workspace.transfer_ownership', 'workspace.update', 'wallet.update_alerts'];
for (const id of platformOnly) CLASSES[id] = 'platform_only';

const SRC = join(import.meta.dirname, '..', 'src');
const FILES: Record<string, string> = {
  'agent.create': 'ai/agents/agent.handlers.ts',
  'channel.zalo.start_login': 'channels/actions/channel-connect.handlers.ts',
  'channel.email.connect': 'channels/email/email.handlers.ts',
  'webchat.update_widget': 'channels/webchat/webchat.handlers.ts',
  'bank_feed.connect': 'sales/payments/actions/finance-config.handlers.ts',
};

describe('phân loại action nền tảng', () => {
  it('mọi action db:platform có lớp; không lớp nào bỏ sót', () => {
    expect(PLATFORM.filter((id) => !CLASSES[id])).toEqual([]);
    expect(Object.keys(CLASSES).sort()).toEqual(PLATFORM);
  });

  it('không còn stub: wallet.update_alerts (TIP-039) là platform_only', () => {
    expect(tipOwnerOf('wallet.update_alerts')).toBe('039');
    expect(CLASSES['wallet.update_alerts']).toBe('platform_only');
  });

  it('handler ghi tenant tách pha: có applyTenant, không còn `tx.<model>.create/update` trong execute', () => {
    for (const [id, f] of Object.entries(FILES)) {
      const s = readFileSync(join(SRC, f), 'utf8');
      expect(s, id).toMatch(/applyTenant\(/);
      expect(s, id).toMatch(/tenantPlan:/);
      // Trong khối execute của action nền tảng không gọi ghi tenant (applyTenant / undo được phép).
      const exec = s.split(/async execute\(/).slice(1).map((b) => b.split(/\n  async (applyTenant|finalizePlatform|preview|undo)\(/)[0]!);
      for (const b of exec) if (/ptx\?: PlatformTx/.test(b) || /needPtx|PlatformTx \|/.test(b)) expect(b, id).not.toMatch(/\btx\.(channelAccount|aiAgent|webchatWidget|tenantBankFeed|integrationConnection)\.(create|update|upsert|delete)/);
    }
  });
});

describe('tenant chỉ đọc ở pha nền tảng', () => {
  const fake = {
    channelAccount: { findUnique: async () => ({ id: 'a' }), count: async () => 2, create: async () => ({}), updateMany: async () => ({ count: 1 }) },
    $queryRaw: async () => [],
    $executeRaw: async () => 1,
    $transaction: async () => undefined,
  } as unknown as TenantDb;
  const ro = readOnlyTenant(fake) as unknown as typeof fake & Record<string, never>;

  it('đọc được; ghi model / executeRaw / $transaction → INTERNAL', async () => {
    expect(await (ro as unknown as { channelAccount: { count(): Promise<number> } }).channelAccount.count()).toBe(2);
    expect(() => (ro as unknown as { channelAccount: { create(): unknown } }).channelAccount.create()).toThrow(/pha nền tảng không được ghi tenant \(channelAccount\.create\)/);
    expect(() => (ro as unknown as { channelAccount: { updateMany(): unknown } }).channelAccount.updateMany()).toThrow(/updateMany/);
    expect(() => (ro as unknown as { $executeRaw(): unknown }).$executeRaw()).toThrow(/\$executeRaw/);
    expect(() => (ro as unknown as { $transaction(): unknown }).$transaction()).toThrow(/\$transaction/);
  });
});
