// Factory DB nền tảng (TIP-045b annex E): user test (`@test.appchat.vn` — `db:cleanup-test` nhận ra), workspace + membership với vai trò
// tường minh. Ghi nhận id đã tạo để `cleanup` chỉ xoá đúng những gì lượt này tạo.
import type { PlatformDb } from '../../src';
import { newId, tag, type FactoryClock } from './clock';

export interface IdentityFixtures {
  user(name?: string): Promise<{ id: string; email: string }>;
  workspace(ownerUserId: string, dbName: string): Promise<{ id: string; dbName: string }>;
  member(workspaceId: string, userId: string, roleKey?: string): Promise<void>;
  cleanup(): Promise<void>;
}

export function identityFactory(db: PlatformDb, clock: FactoryClock): IdentityFixtures {
  const users: string[] = [];
  const workspaces: string[] = [];
  return {
    async user(name = 'Fixture') {
      const id = newId();
      const email = `f-${tag()}@test.appchat.vn`;
      await db.user.create({ data: { id, email, name, emailVerifiedAt: clock.now(), createdAt: clock.now() } });
      users.push(id);
      return { id, email };
    },
    async workspace(ownerUserId, dbName) {
      const id = newId();
      await db.workspace.create({ data: { id, name: 'WS fixture', slug: `ws-f-${tag()}`, ownerUserId, dbName, dbStatus: 'active', createdAt: clock.now() } });
      await db.membership.create({ data: { workspaceId: id, userId: ownerUserId, roleKey: 'owner', joinedAt: clock.now() } });
      workspaces.push(id);
      return { id, dbName };
    },
    async member(workspaceId, userId, roleKey = 'sales') {
      await db.membership.create({ data: { workspaceId, userId, roleKey, joinedAt: clock.now() } });
    },
    async cleanup() {
      await db.membership.deleteMany({ where: { OR: [{ workspaceId: { in: workspaces } }, { userId: { in: users } }] } });
      await db.workspace.deleteMany({ where: { id: { in: workspaces } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    },
  };
}
