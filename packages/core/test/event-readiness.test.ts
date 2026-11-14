// TIP-003b §5.1–5.3 / AC7: sẵn sàng chỉ khi registry đóng băng khớp manifest kỳ vọng độc lập — thiếu / thừa / sai version / consumer v1
// chưa có adapter / topic khai không-consumer mà có consumer → không sẵn sàng; dispatcher v2 không tiêu thụ khi chưa sẵn sàng.
import { afterEach, describe, expect, it } from 'vitest';
import { dispatchV2Job, EventProtocolNotReadyError, evaluateReadiness, freezeEventRegistry, registerEventContract, resetEventReadinessForTest, resetEventRegistryForTest, startEventProtocol, type EventContract, type EventProtocolManifest } from '../src/kernel';

const proj = (name: string, topics: string[], v = 1): EventContract => ({ name, mode: 'projection', contractVersion: v, topics, apply: async () => ({ kind: 'applied' }) });
const manifest = (over: Partial<EventProtocolManifest> = {}): EventProtocolManifest => ({
  version: 1,
  consumers: [{ name: 'fx.a', status: 'active', mode: 'projection', contractVersion: 1, topics: ['tag.created'], owner: '003b', roles: ['jobs', 'all'] }],
  noSubscriber: ['workspace.ready'],
  ...over,
});

afterEach(() => {
  resetEventRegistryForTest();
  resetEventReadinessForTest();
});

describe('readiness v2', () => {
  it('khớp đủ → sẵn sàng', () => {
    registerEventContract(proj('fx.a', ['tag.created']));
    expect(evaluateReadiness(manifest(), freezeEventRegistry(['tag.created', 'workspace.ready']), 'jobs')).toMatchObject({ ready: true, missing: [], unexpected: [] });
  });

  it('thiếu đăng ký / thừa đăng ký / sai version / sai topic → không sẵn sàng', () => {
    expect(evaluateReadiness(manifest(), freezeEventRegistry(['tag.created', 'workspace.ready']), 'jobs')).toMatchObject({ ready: false, missing: ['fx.a'] });
    resetEventRegistryForTest();
    registerEventContract(proj('fx.a', ['tag.created'], 2));
    registerEventContract(proj('fx.extra', ['tag.created']));
    const r = evaluateReadiness(manifest(), freezeEventRegistry(['tag.created', 'workspace.ready']), 'jobs');
    expect(r).toMatchObject({ ready: false, mismatched: ['fx.a'], unexpected: ['fx.extra'] });
  });

  it('consumer v1 chưa có adapter → blocker ghi chủ adapter; retired mà còn đăng ký → unexpected', () => {
    registerEventContract(proj('fx.a', ['tag.created']));
    registerEventContract(proj('old.owner', ['tag.created']));
    const m = manifest({ consumers: [...manifest().consumers, { name: 'notify', status: 'requires_adapter', owner: '006b', roles: ['jobs'] }, { name: 'old.owner', status: 'retired', owner: '015d', roles: ['jobs'] }] });
    const r = evaluateReadiness(m, freezeEventRegistry(['tag.created', 'workspace.ready']), 'jobs');
    expect(r.ready).toBe(false);
    expect(r.blockers).toEqual(['notify:006b']);
    expect(r.unexpected).toEqual(['old.owner:retired']);
  });

  it('topic khai không-consumer mà có hợp đồng → lệch', () => {
    registerEventContract(proj('fx.a', ['tag.created']));
    registerEventContract(proj('fx.b', ['workspace.ready']));
    const m = manifest({ consumers: [...manifest().consumers, { name: 'fx.b', status: 'active', mode: 'projection', contractVersion: 1, topics: ['workspace.ready'], owner: '003b', roles: ['jobs'] }] });
    expect(evaluateReadiness(m, freezeEventRegistry(['tag.created', 'workspace.ready']), 'jobs').mismatched).toEqual(['workspace.ready:declared_no_subscriber']);
  });

  it('thiếu hạ tầng → không sẵn sàng; job v2 bị từ chối (không tiêu thụ, không chạm DB)', async () => {
    registerEventContract(proj('fx.a', ['tag.created']));
    expect(startEventProtocol({ manifest: manifest(), role: 'jobs', infra: false })).toMatchObject({ ready: false, blockers: ['infra_unavailable'] });
    const resolver = { get: async () => { throw new Error('không được chạm DB'); } };
    await expect(dispatchV2Job(resolver as never, { id: 'x', workspaceId: 'w' })).rejects.toBeInstanceOf(EventProtocolNotReadyError);
  });
});
