// TIP-026c AC2: thẻ Sales Pipeline 360° — 6 bước, xác suất cố định theo giai đoạn (Tư vấn / Demo 50%), dự báo; thiếu quote.view → "Ẩn theo
// quyền" (không 0); bước tiếp theo theo luật server; gợi ý AI chỉ khi có — Áp dụng = set_stage kèm suggestion_id; Chuyển giai đoạn = bước kế;
// không sửa được → không nút ghi; rỗng thật; thêm nhanh → create (giá trị triệu → VND).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { OpportunityCardDto, OpportunityItemDto } from '@appchat/shared';

const s = vi.hoisted(() => ({ setStage: vi.fn(), create: vi.fn(async () => ({ result: { opportunity_id: 'o9' } })), open: vi.fn(), can: true, quick: { contactId: null as string | null, values: {} as Record<string, unknown> } }));
const tr = (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k);
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign(tr, { rich: tr, has: () => true }) }));
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ date: (d: string) => d.slice(0, 10), money: (v: string) => `${v}₫`, moneyShort: (v: string) => `${Number(v) / 1e6}tr₫`, number: String }) }));
vi.mock('../authz/useCan', () => ({ useCan: () => s.can }));
vi.mock('./useOpportunityActions', () => ({ useOpportunityActions: () => ({ pending: false, setStage: s.setStage, create: s.create }) }));
vi.mock('./opportunity-store', () => ({ useOpportunityUi: (sel: (x: Record<string, unknown>) => unknown) => sel({ open: s.open }) }));
vi.mock('../contact-activities/activity-store', () => ({ useActivityUi: (sel: (x: Record<string, unknown>) => unknown) => sel({ openList: vi.fn() }) }));
vi.mock('./quick-add-store', () => ({
  useQuickAddUi: (sel: (x: Record<string, unknown>) => unknown) =>
    sel({ ...s.quick, start: (c: string, v = {}) => Object.assign(s.quick, { contactId: c, values: v }), stop: () => Object.assign(s.quick, { contactId: null, values: {} }) }),
}));

import { OpportunityPanel } from './OpportunityPanel';

const card = (o: Partial<OpportunityCardDto> = {}): OpportunityCardDto => ({
  id: 'o1', contact_id: 'k1', title: 'Liệu trình HIFU', need: '', amount_vnd: '48000000', forecast_vnd: '24000000', stage: 'demo', probability: 50, expected_close_date: '2026-06-15',
  owner: { id: 'u1', name: 'Trâm' }, source_kind: 'conversation', lost_reason: null, items: [{ product_id: null, name: 'HIFU', qty: 1 }], closed_at: null, stage_changed_at: '2026-06-02T03:40:00Z',
  archived: false, updated_at: '2026-06-02T03:40:00Z', version: 4, quote: null, next_step: { key: 'send_quote', params: {}, source: 'rule' }, suggestion: null, ...o,
});
const lost: OpportunityItemDto = { ...card({ id: 'o2', stage: 'lost', probability: 0, lost_reason: 'price', closed_at: '2025-08-12T03:00:00Z' }) };

describe('OpportunityPanel', () => {
  afterEach(cleanup);
  beforeEach(() => {
    s.setStage.mockReset();
    s.create.mockClear();
    s.can = true;
    Object.assign(s.quick, { contactId: null, values: {} });
  });

  it('Tư vấn / Demo 48tr: 6 bước, 50%, dự báo 24tr, sản phẩm, bước tiếp theo luật', () => {
    render(<OpportunityPanel contactId="k1" current={card()} history={[]} canEdit />);
    expect(screen.getAllByTestId(/^opp-seg-/)).toHaveLength(6);
    expect(screen.getByTestId('opp-prob').textContent).toBe('50%');
    expect(screen.getByTestId('opp-forecast').textContent).toBe('approx:{"v":"24tr₫"}');
    expect(screen.getByText('HIFU × 1')).toBeTruthy();
    expect(screen.getByTestId('opp-next').textContent).toContain('next.send_quote');
    expect(screen.queryByTestId('opp-ai')).toBeNull();
  });

  it('thiếu quote.view: thấy giai đoạn, tiền "Ẩn theo quyền" (không 0)', () => {
    render(<OpportunityPanel contactId="k1" current={card({ amount_vnd: undefined, forecast_vnd: undefined, amount_hidden: true })} history={[]} canEdit />);
    expect(screen.getByTestId('opp-stage').textContent).toBe('stage.demo');
    expect(screen.getByTestId('opp-amount').textContent).toBe('hidden');
    expect(screen.getByTestId('opp-forecast').textContent).toBe('hidden');
  });

  it('Chuyển giai đoạn = bước kế với version đang hiển thị; Áp dụng gợi ý gửi suggestion_id', () => {
    const sug = { id: 'ev1', to_stage: 'quote' as const, reason_key: 'buying_signal', created_at: '2026-06-02T04:00:00Z' };
    render(<OpportunityPanel contactId="k1" current={card({ suggestion: sug })} history={[]} canEdit />);
    fireEvent.click(screen.getByTestId('opp-move-next'));
    expect(s.setStage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'o1', version: 4 }), 'quote');
    fireEvent.click(screen.getByTestId('opp-ai-apply'));
    expect(s.setStage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'o1' }), 'quote', 'ev1');
  });

  it('Đàm phán: Chuyển giai đoạn khoá (Đã mua cần chứng từ); không sửa được → không nút ghi, thanh khoá', () => {
    const { unmount } = render(<OpportunityPanel contactId="k1" current={card({ stage: 'negotiation' })} history={[]} canEdit />);
    expect((screen.getByTestId('opp-move-next') as HTMLButtonElement).disabled).toBe(true);
    unmount();
    render(<OpportunityPanel contactId="k1" current={card()} history={[]} canEdit={false} />);
    expect(screen.queryByTestId('opp-add')).toBeNull();
    expect((screen.getByTestId('opp-seg-lead') as HTMLButtonElement).disabled).toBe(true);
  });

  it('rỗng thật + lịch sử cơ hội thật (chip Thua, lý do)', () => {
    render(<OpportunityPanel contactId="k1" current={null} history={[lost]} canEdit />);
    expect(screen.getByTestId('opp-empty')).toBeTruthy();
    expect(screen.getByTestId('opp-hist-o2').textContent).toContain('lostReason.price');
    fireEvent.click(screen.getByTestId('opp-hist-o2'));
    expect(s.open).toHaveBeenCalledWith('o2');
  });

  it('thêm nhanh: tên + giá trị (triệu) → create VND; giá trị sai → khoá Lưu', async () => {
    s.quick.contactId = 'k1';
    render(<OpportunityPanel contactId="k1" current={null} history={[]} canEdit />);
    fireEvent.change(screen.getByTestId('opp-new-name'), { target: { value: 'Gói triệt lông 2026' } });
    fireEvent.change(screen.getByTestId('opp-new-value'), { target: { value: 'abc' } });
    expect((screen.getByTestId('opp-new-save') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('opp-new-value'), { target: { value: '2,5' } });
    fireEvent.click(screen.getByTestId('opp-new-save'));
    expect(s.create).toHaveBeenCalledWith('k1', 'Gói triệt lông 2026', '2500000');
  });
});
