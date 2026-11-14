// TIP-026c AC5 / §5.1: drawer Cơ hội 360° — chuỗi chứng từ thật (mã + trạng thái; có mà không quyền → "Không có quyền xem", không lộ mã),
// "Khách chốt" (không "Khách duyệt") gọi quote.mark_accepted, "Khách từ chối" mở chọn lý do; Đánh dấu Thua bắt buộc 1 trong 4 lý do →
// mark_lost; Thua → hộp lý do + Mở lại → reopen; tạo hợp đồng / đơn từ báo giá đã chốt; không sửa được → không nút ghi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { OpportunityDetailDto } from '@appchat/shared';

const s = vi.hoisted(() => ({
  detail: null as unknown,
  act: { setStage: vi.fn(), markLost: vi.fn(async () => ({})), reopen: vi.fn() },
  chain: { accept: vi.fn(), toContract: vi.fn(), toOrder: vi.fn(), newQuote: vi.fn(), newInvoice: vi.fn(), finance: vi.fn() },
  ui: { drawer: 'o1' as string | null, askLost: false },
}));
const tr = (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k);
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign(tr, { rich: tr, has: () => true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => d.slice(0, 10), money: (v: string) => `${v}₫`, moneyShort: (v: string) => `${Number(v) / 1e6}tr₫` }) }));
vi.mock('../authz/useCan', () => ({ useCan: () => true }));
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQuery: (q: { queryKey: unknown[] }) => ({ data: q.queryKey[1] === 'opportunity' ? s.detail : { name: 'Chị Lan', insights: { ltv: '30500000', debt: { due: '0', overdue: '0', open: 0 } } } }),
  useInfiniteQuery: () => ({ data: { pages: [{ data: [] }] } }),
}));
vi.mock('./useOpportunityActions', () => ({ useOpportunityActions: () => ({ pending: false, ...s.act }) }));
vi.mock('./useOpportunityChain', () => ({ useOpportunityChain: () => ({ pending: false, ...s.chain }) }));
vi.mock('./opportunity-store', () => ({
  useOpportunityUi: (sel: (x: Record<string, unknown>) => unknown) => sel({ ...s.ui, close: vi.fn(), open: vi.fn(), setAskLost: (v: boolean) => (s.ui.askLost = v) }),
}));

import { OpportunityDrawer } from './OpportunityDrawer';

const step = (docs: { id: string; code: string; status: string }[] = [], hidden = false) => ({ hidden, docs });
const detail = (o: Partial<OpportunityDetailDto> = {}): OpportunityDetailDto => ({
  id: 'o1', contact_id: 'k1', title: 'Gói AI CSKH', need: '', amount_vnd: '60000000', forecast_vnd: '42000000', stage: 'quote', probability: 70, expected_close_date: null,
  owner: { id: 'u1', name: 'Minh' }, source_kind: 'manual', lost_reason: null, items: [], closed_at: null, stage_changed_at: '2026-06-02T03:40:00Z', archived: false,
  updated_at: '2026-06-02T03:40:00Z', version: 2, quote: null, next_step: null, suggestion: null,
  chain: { quote: step([{ id: 'q1', code: 'BG-0398', status: 'viewed' }]), contract: step(), order: step(), invoice: step(), paid: null },
  events: [{ id: 'e1', kind: 'stage', from_stage: 'demo', to_stage: 'quote', ref: null, params: {}, actor: { type: 'user', name: 'Minh' }, created_at: '2026-06-02T03:40:00Z' }],
  can_edit: true, ...o,
});

describe('OpportunityDrawer', () => {
  afterEach(cleanup);
  beforeEach(() => {
    Object.values(s.act).forEach((f) => f.mockClear());
    Object.values(s.chain).forEach((f) => f.mockClear());
    s.ui.askLost = false;
  });

  it('chuỗi: báo giá đã xem → "Khách chốt" gọi mark_accepted; "Khách từ chối" mở chọn lý do', () => {
    s.detail = detail();
    const { rerender } = render(<OpportunityDrawer />);
    expect(screen.getByTestId('opp-chain-1').textContent).toContain('BG-0398');
    fireEvent.click(screen.getByTestId('opp-chain-accept'));
    expect(s.chain.accept).toHaveBeenCalledWith('q1');
    fireEvent.click(screen.getByTestId('opp-chain-reject'));
    rerender(<OpportunityDrawer />);
    expect(screen.getByTestId('opp-lost-picker')).toBeTruthy();
  });

  it('Đánh dấu Thua: chọn "Giá cao" → mark_lost(price) với version đang hiển thị', async () => {
    s.detail = detail();
    const { rerender } = render(<OpportunityDrawer />);
    fireEvent.click(screen.getByTestId('opp-lose'));
    rerender(<OpportunityDrawer />);
    fireEvent.click(screen.getByTestId('opp-lost-price'));
    expect(s.act.markLost).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', version: 2 }), 'price');
  });

  it('Thua: hộp lý do + Mở lại → reopen; không còn thanh giai đoạn / nút Thua', () => {
    s.detail = detail({ stage: 'lost', probability: 0, lost_reason: 'competitor' });
    render(<OpportunityDrawer />);
    expect(screen.getByTestId('opp-lost-box').textContent).toContain('lostReason.competitor');
    expect(screen.queryByTestId('opp-stagebar')).toBeNull();
    expect(screen.queryByTestId('opp-lose')).toBeNull();
    fireEvent.click(screen.getByTestId('opp-reopen'));
    expect(s.act.reopen).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }));
  });

  it('báo giá đã chốt → tạo hợp đồng / đơn; chứng từ không quyền → "Không có quyền xem" không lộ mã', () => {
    s.detail = detail({ stage: 'negotiation', chain: { quote: step([{ id: 'q1', code: 'BG-0391', status: 'accepted' }]), contract: step([], true), order: step(), invoice: step(), paid: null } });
    render(<OpportunityDrawer />);
    expect(screen.getByTestId('opp-chain-2').textContent).toContain('chain.hidden');
    fireEvent.click(screen.getByTestId('opp-chain-to-order'));
    expect(s.chain.toOrder).toHaveBeenCalledWith('q1');
  });

  it('không sửa được: không nút chuỗi / Thua, thanh giai đoạn khoá', () => {
    s.detail = detail({ can_edit: false });
    render(<OpportunityDrawer />);
    expect(screen.queryByTestId('opp-chain-accept')).toBeNull();
    expect(screen.queryByTestId('opp-lose')).toBeNull();
    expect((screen.getByTestId('opp-step-lead') as HTMLButtonElement).disabled).toBe(true);
  });
});
