// Cửa hội tụ ngân hàng cho hook generic (TIP-012b §2.4 mục 4): kết nối port `bank_feed` có feed tài chính ĐANG BẬT (finance.manage đã
// gắn) → sự kiện đã xác thực đi vào ingress chuẩn tắc của sales (biên nhận + outbox, cùng đường `/hooks/tenant-payments`). Không feed
// đang bật → webhook service giữ như sự kiện thô chưa gắn (không kích hoạt khớp tiền qua integrations.manage). integrations không import
// sales: sales đăng ký sink lúc khởi động (cùng mẫu registerCallOp).
import type { TenantDb } from '@appchat/db';
import type { ConnectionCtx, ConnectorAdapter } from '@appchat/integrations';

export interface BankIngressAck {
  accepted: number;
  duplicate: number;
  ignored: number;
}

/** Trả null khi kết nối không có feed tài chính đang bật (để webhook service lưu sự kiện thô như cũ). */
export type BankIngressSink = (a: { db: TenantDb; ws: string; provider: string; connId: string; adapter: ConnectorAdapter; ctx: ConnectionCtx; payload: unknown; now: Date }) => Promise<BankIngressAck | null>;

let sink: BankIngressSink | null = null;
export const registerBankIngressSink = (s: BankIngressSink) => void (sink = s);
export const unregisterBankIngressSink = () => void (sink = null);
export const bankIngressSink = () => sink;
