// TIP-023g (AC1, AC2, AC7): lối vào theo bản ghi — mở = 0 lời gọi (không lượt / không đề xuất); Gửi mới có lượt mang `record_intent`
// có kiểu; gửi lại cùng việc dùng LẠI request_id; đổi bản ghi → thế hệ mới, kết quả trễ của bản ghi cũ bị bỏ; gợi ý của Đề nghị thanh toán
// chỉ là chữ trích vào ô việc (không chạy); đề xuất combo nói rõ "chưa tạo gì", lỗi 404 nói đúng lý do.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ApiRequestError, type RecordProposalDto } from '@appchat/shared';
import common from '../../../../messages/vi/common.json';

const stream = vi.fn();
const post = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/quotes' }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/shared/shell/useShellData', () => ({ useMe: () => ({ data: { current_workspace_id: 'ws1' } }) }));
vi.mock('../../api/client', () => ({ transport: { post: (...a: unknown[]) => post(...a) } }));
vi.mock('../turn-stream', () => ({ streamTurn: (...a: unknown[]) => stream(...a) }));
vi.mock('../../genui', () => ({ GenUiRenderer: () => null }));

import { RecordAssistantPanel, type RecordAssistantPanelProps } from './RecordAssistantPanel';
import { useRecordScopes } from './store';
import { useScreenThreads } from '../useScreenAssistant';

const QID = '0190f000-0000-7000-8000-000000000001';
const QID2 = '0190f000-0000-7000-8000-000000000002';
const SUGGESTION = 'invoice.delete; nhắc thanh toán';

type Sent = { recordIntent: { entity: string; entity_id: string; intent: string; request_id: string; user_task?: string }; requestId: string; context: object };

beforeEach(() => {
  stream.mockReset().mockResolvedValue({ session_id: 's1', run_id: 'r1', events: [{ type: 'delta', text: 'ok' }] });
  post.mockReset();
  useRecordScopes.setState({ ws: 'ws1', scopes: {}, seq: 0 });
  useScreenThreads.setState({ ws: 'ws1', threads: {} });
});
afterEach(cleanup);

function Host({ module, choices }: { module: string; choices?: RecordAssistantPanelProps['choices'] }) {
  const scope = useRecordScopes((s) => s.scopes[module] ?? null);
  return (
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ common }}>
      <RecordAssistantPanel module={module} scope={scope} {...(choices ? { choices } : {})} />
    </NextIntlClientProvider>
  );
}

const open = (module: string, entity: 'quote' | 'product' | 'invoice', id: string, label: string) => act(() => void useRecordScopes.getState().open({ module, entity, id, label }));

describe('RecordAssistantPanel', () => {
  it('mở bản ghi = 0 lời gọi; Gửi → lượt có record_intent đúng bản ghi; gửi lại cùng việc → cùng request_id', async () => {
    open('quotes', 'quote', QID, 'BG-1');
    render(<Host module="quotes" />);
    expect(screen.getByTestId('rai-bound').textContent).toContain('BG-1');
    expect(stream).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    for (let i = 0; i < 2; i++) {
      fireEvent.change(screen.getByTestId('rai-task'), { target: { value: 'Tóm tắt báo giá' } });
      await act(async () => fireEvent.click(screen.getByTestId('rai-submit')));
    }
    expect(stream).toHaveBeenCalledTimes(2);
    const [a, b] = stream.mock.calls.map((c) => c[0] as Sent);
    expect(a!.recordIntent).toMatchObject({ entity: 'quote', entity_id: QID, intent: 'inspect', user_task: 'Tóm tắt báo giá' });
    expect(a!.requestId).toBe(a!.recordIntent.request_id);
    expect(b!.recordIntent.request_id).toBe(a!.recordIntent.request_id);
    // Lượt theo bản ghi không mang selection / id của ngữ cảnh màn chung.
    expect(a!.context).toEqual({ route: '/quotes', surface: 'drawer' });
  });

  it('đổi bản ghi → thế hệ mới; đề xuất trễ của bản ghi cũ bị bỏ', async () => {
    let resolve!: (v: RecordProposalDto) => void;
    post.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    open('products', 'product', QID, 'SP A');
    render(<Host module="products" choices={[{ intent: 'product_combo', labelKey: 'intent.product_combo' }]} />);
    await act(async () => fireEvent.click(screen.getByTestId('rai-submit')));
    const g1 = useRecordScopes.getState().scopes.products!.generation;
    open('products', 'product', QID2, 'SP B');
    expect(useRecordScopes.getState().scopes.products!.generation).toBeGreaterThan(g1);
    await act(async () => resolve({ id: 'p', request_id: 'x', run_id: 'r', entity: 'product', entity_id: QID, intent: 'product_combo', state: 'validated', combo: { name: 'C', rationale: '', items: [], unresolved: [] } }));
    expect(screen.queryByTestId('rai-proposal')).toBeNull();
    expect(screen.getByTestId('rai').dataset.record).toBe(QID2);
  });

  it('gợi ý (chữ) chỉ trích vào ô việc — không lượt / không action cho tới khi bấm Gửi', () => {
    open('invoices', 'invoice', QID, 'DN-1');
    render(
      <Host
        module="invoices"
        choices={[
          { intent: 'inspect', labelKey: 'intent.inspect', task: '' },
          { intent: 'invoice_task', labelKey: 'intent.invoice_task', label: SUGGESTION, task: SUGGESTION },
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId('rai-intent-invoice_task'));
    expect((screen.getByTestId('rai-task') as HTMLTextAreaElement).value).toBe(SUGGESTION);
    expect(stream).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('đề xuất combo: "chưa tạo gì" + món + giá danh mục; lỗi 404 nói đúng lý do', async () => {
    post.mockResolvedValueOnce({ id: 'p', request_id: 'x', run_id: 'r', entity: 'product', entity_id: QID, intent: 'product_combo', state: 'validated', combo: { name: 'Combo A', rationale: 'kèm', items: [{ product_id: QID, qty: 1, name: 'SP A', price: '500000' }], unresolved: [] } });
    open('products', 'product', QID, 'SP A');
    render(<Host module="products" choices={[{ intent: 'product_combo', labelKey: 'intent.product_combo' }]} />);
    await act(async () => fireEvent.click(screen.getByTestId('rai-submit')));
    expect(post.mock.calls[0]![0]).toBe('/assistant/record-proposals');
    expect(screen.getByTestId('rai-proposal').textContent).toContain(common.recordAi.proposalLead);
    expect(screen.getByTestId('rai-combo-items').textContent).toContain('500.000');
    post.mockRejectedValueOnce(new ApiRequestError(404, { code: 'NOT_FOUND', message: 'x' }));
    await act(async () => fireEvent.click(screen.getByTestId('rai-submit')));
    expect(screen.getByTestId('rai-error').textContent).toBe(common.recordAi.error.NOT_FOUND);
  });
});

describe('useRecordScopes', () => {
  it('lần gắn workspace đầu giữ phạm vi vừa mở; đổi workspace thật → xoá', () => {
    useRecordScopes.setState({ ws: '', scopes: {}, seq: 0 });
    useRecordScopes.getState().open({ module: 'quotes', entity: 'quote', id: 'q_1', label: 'BG-1' });
    useRecordScopes.getState().bindWorkspace('ws_a');
    expect(useRecordScopes.getState().scopes.quotes?.id).toBe('q_1');
    useRecordScopes.getState().bindWorkspace('ws_b');
    expect(useRecordScopes.getState().scopes).toEqual({});
  });
});
