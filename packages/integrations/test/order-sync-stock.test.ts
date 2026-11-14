import { describe, expect, it } from 'vitest';
import { MockOrderSyncProvider, mockMarketplaceManifest, stockMasterOf } from '../src';

describe('OrderSyncProvider stock_master & pullStock (TIP-031c)', () => {
  const provider = new MockOrderSyncProvider();

  it('stockMasterOf defaults to appchat and recognizes external', () => {
    expect(stockMasterOf(undefined)).toBe('appchat');
    expect(stockMasterOf({})).toBe('appchat');
    expect(stockMasterOf({ stock_master: 'invalid' })).toBe('appchat');
    expect(stockMasterOf({ stock_master: 'external' })).toBe('external');
  });

  it('manifest exposes stock_master/stock_snapshots and validates stock_master', () => {
    const keys = mockMarketplaceManifest.auth.fields.map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(['stock_master', 'stock_snapshots']));
    expect(mockMarketplaceManifest.validate?.({ config: { stock_master: 'external' }, secrets: {} })).toBeNull();
    expect(mockMarketplaceManifest.validate?.({ config: { stock_master: 'appchat' }, secrets: {} })).toBeNull();
    expect(mockMarketplaceManifest.validate?.({ config: { stock_master: 'other' }, secrets: {} })).toEqual({ stock_master: 'invalid' });
  });

  it('pullStock parses valid snapshots, advances cursor when configured, and fails on down api_key', async () => {
    const snapshots = JSON.stringify({
      initial: { items: [{ sku: 'SR-B5', on_hand: 7, as_of: '2026-11-15T01:00:00Z', snapshot_id: 'snap-1' }], next_cursor: 'c2' },
      c2: { items: [{ sku: 'SR-B5', on_hand: 5, as_of: '2026-11-15T02:00:00Z', snapshot_id: 'snap-2' }, { sku: 'BAD', on_hand: 1.5, as_of: 'bad', snapshot_id: '' }], next_cursor: 'c3' },
    });
    const r1 = await provider.pullStock({ id: 'c1', mode: 'sandbox', config: { stock_snapshots: snapshots }, secrets: { api_key: 'mk_1' } }, null);
    expect(r1).toEqual({ items: [{ sku: 'SR-B5', on_hand: 7, as_of: '2026-11-15T01:00:00Z', snapshot_id: 'snap-1' }], next_cursor: 'c2' });
    const r2 = await provider.pullStock({ id: 'c1', mode: 'sandbox', config: { stock_snapshots: snapshots }, secrets: { api_key: 'mk_1' } }, 'c2');
    expect(r2).toEqual({ items: [{ sku: 'SR-B5', on_hand: 5, as_of: '2026-11-15T02:00:00Z', snapshot_id: 'snap-2' }], next_cursor: 'c3' });
    await expect(provider.pullStock({ id: 'c1', mode: 'sandbox', config: {}, secrets: { api_key: 'down_1' } }, null)).rejects.toThrow(/down|không phản hồi/i);
  });
});
