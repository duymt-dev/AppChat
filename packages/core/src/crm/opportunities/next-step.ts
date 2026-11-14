// Bước tiếp theo của cơ hội (TIP-026c §4.3) — BỘ LUẬT xác định, không gọi model mỗi GET (`source: 'rule'`, cùng kiểu
// crm/insights/next-action.ts). Lead mới → gọi xác nhận nhu cầu · Đủ điều kiện → chốt lịch demo · Tư vấn / Demo → lịch hẹn gắn cơ hội sắp
// tới, không có thì gửi báo giá · Báo giá → theo dõi phản hồi {mã} · Đàm phán → tạo hợp đồng / đơn từ {mã}. Đã đóng → null. Client dịch
// khoá `opportunity.next.<key>`; `params` chỉ là dữ liệu thật (mã báo giá / lịch hẹn) người xem được thấy.
import type { OpportunityNextStepDto, OpportunityStage } from '@appchat/shared';

export interface NextFacts {
  stage: OpportunityStage;
  /** Báo giá mới nhất của cơ hội người xem thấy (mã), null khi không có / không quyền. */
  quoteCode: string | null;
  /** Lịch hẹn sắp tới gắn cơ hội (mã), null khi không có / không quyền. */
  appointmentCode: string | null;
}

/** Luật thuần (test được không DB). */
export function nextStepOf(f: NextFacts): OpportunityNextStepDto | null {
  const r = (key: string, params: Record<string, string> = {}): OpportunityNextStepDto => ({ key, params, source: 'rule' });
  switch (f.stage) {
    case 'lead':
      return r('confirm_need');
    case 'qualified':
      return r('book_demo');
    case 'demo':
      return f.appointmentCode ? r('attend_appointment', { code: f.appointmentCode }) : r('send_quote');
    case 'quote':
      return f.quoteCode ? r('follow_quote', { code: f.quoteCode }) : r('send_quote');
    case 'negotiation':
      return f.quoteCode ? r('create_contract_or_order', { code: f.quoteCode }) : r('create_order');
    default:
      return null;
  }
}
