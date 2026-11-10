// TIP-023e §2.2-§2.3: authority.ts lọc quyền HIỆN HÀNH trên một danh sách action_id — dùng lại ĐÚNG catalog.ts (allowedFor/
// modeAllows), không tự chế lại rule; action_id lạ (không còn trong registry) bị loại âm thầm, không throw.
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { currentlyAllowed, filterAuthorized } from '../src/ai/assistant/discovery/authority';

const owner = authzForRole('owner', 'u1');
const cs = authzForRole('cs', 'u3');
const implementedAll = () => true;
const implementedNone = () => false;

describe('authority.ts — lọc quyền hiện hành (TIP-023e §2.2)', () => {
  it('filterAuthorized giữ thứ tự, bỏ action vượt quyền và action chưa có handler thật', () => {
    const ids = ['contact.create', 'billing.lifecycle_step', 'quote.create', 'not.a.real.action'];
    expect(filterAuthorized(ids, owner, 'cowork', implementedAll).map((a) => a.id)).toEqual(['contact.create', 'quote.create']);
    expect(filterAuthorized(ids, owner, 'cowork', implementedNone)).toEqual([]);
  });

  it('chế độ Chat chỉ giữ action read', () => {
    const ids = ['contact.search', 'contact.create'];
    expect(filterAuthorized(ids, owner, 'chat', implementedAll).map((a) => a.id)).toEqual(['contact.search']);
  });

  it('quyền hẹp hơn (cs) lọc bỏ action ngoài quyền dù cùng tồn tại trong registry', () => {
    const ids = ['contact.create', 'quote.create'];
    const got = filterAuthorized(ids, cs, 'cowork', implementedAll).map((a) => a.id);
    expect(got).not.toContain('quote.create');
  });

  it('module restriction: action đúng module mới qua', () => {
    const ids = ['contact.create', 'quote.create'];
    expect(filterAuthorized(ids, owner, 'cowork', implementedAll, 'crm').map((a) => a.id)).toEqual(['contact.create']);
  });

  it('currentlyAllowed: action undefined (id lạ) → false, không throw', () => {
    expect(currentlyAllowed(undefined, owner, 'cowork', implementedAll)).toBe(false);
  });
});
