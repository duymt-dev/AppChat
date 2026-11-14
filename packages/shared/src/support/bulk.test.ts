import { describe, expect, it } from 'vitest';
import { canonicalTicketPatch, checkIfVersions, normalizeTicketIds, patchFields } from './bulk';

const A = '0190f000-0000-7000-8000-0000000000aa';
const B = '0190f000-0000-7000-8000-0000000000bb';

describe('ticket bulk — chuẩn hoá', () => {
  it('bỏ trùng một lần, giữ thứ tự nhập, đếm trùng', () => {
    expect(normalizeTicketIds([B, A, B.toUpperCase(), ' ', A])).toEqual({ ids: [B, A], duplicates: 3 });
  });

  it('patch kết hợp người phụ trách + ưu tiên; hai ô người phụ trách / rỗng → lỗi', () => {
    expect(canonicalTicketPatch({ assignee_user_id: A, priority: 'high' })).toEqual({ assignee: { kind: 'user', id: A }, priority: 'high' });
    expect(canonicalTicketPatch({ assignee_agent_id: B })).toEqual({ assignee: { kind: 'agent', id: B } });
    expect(canonicalTicketPatch({ assignee_user_id: A, assignee_agent_id: B })).toEqual({ field: 'assignee', code: 'one_only' });
    expect(canonicalTicketPatch({ assignee_user_id: '  ' })).toEqual({ field: 'change', code: 'required' });
    expect(patchFields({ assignee: { kind: 'user', id: A }, priority: 'low' })).toEqual(['assignee', 'priority']);
  });

  it('if_versions chỉ cho id đã chọn', () => {
    expect(checkIfVersions([A], { [A]: 2 })).toBeNull();
    expect(checkIfVersions([A], { [B]: 2 })).toEqual({ field: `if_versions.${B}`, code: 'not_selected' });
    expect(checkIfVersions([A], undefined)).toBeNull();
  });
});
