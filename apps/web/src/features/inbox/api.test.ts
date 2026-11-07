// Khoá bộ lọc FE → tham số API danh sách hội thoại (TIP-025).
import { describe, expect, it } from 'vitest';
import { convParams } from './api';

describe('convParams', () => {
  it('khoá FE → tham số API (TIP-025): ch_<kênh>, thư mục, tài khoản, tìm, sắp xếp; bộ lọc đã lưu = tất cả', () => {
    expect(convParams({ tab: 'all', channel: null, accountId: null, q: '  ', sort: 'latest' })).toEqual({});
    expect(convParams({ tab: 'ch_email', channel: null, accountId: 'a9', q: 'lan', sort: 'unread' })).toEqual({ channel: 'email', channel_account_id: 'a9', q: 'lan', sort: 'unread' });
    expect(convParams({ tab: 'mention', channel: 'webchat', accountId: null, q: '', sort: 'vip' })).toEqual({ folder: 'mention', channel: 'webchat' });
    expect(convParams({ tab: 'saved_0', channel: null, accountId: null, q: '', sort: 'latest' })).toEqual({});
  });

});
