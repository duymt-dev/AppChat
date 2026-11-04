// Registry metric của tiến trình (TIP-045b annex B, Blueprint §11 "api / worker — prom-client tại /metrics"): một Registry riêng mỗi tiến
// trình (không dùng register toàn cục — module dựng lại trong test không đăng ký trùng), metric mặc định của Node (CPU / heap / event
// loop) + bộ metric nghiệp vụ. Nhãn CHỈ lấy từ tập hữu hạn: mẫu route, action id trong registry, họ queue, provider / model khai cấu
// hình, kết quả — KHÔNG có workspace / user / tài khoản / run id (cardinality, ops §2.3).
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export interface AppMetrics {
  registry: Registry;
  httpDuration: Histogram<'route' | 'method' | 'status'>;
  actionTotal: Counter<'action' | 'source' | 'result'>;
  jobDuration: Histogram<'queue' | 'result'>;
  queueDepth: Gauge<'queue' | 'state'>;
  outboxLag: Gauge;
  llmLatency: Histogram<'provider' | 'model' | 'purpose'>;
  llmTokens: Counter<'provider' | 'model' | 'purpose' | 'kind'>;
  llmErrors: Counter<'provider' | 'model' | 'purpose'>;
  creditCharged: Counter<'purpose'>;
  channelSends: Counter<'channel' | 'result'>;
  channelAccounts: Gauge<'type' | 'status'>;
  tenantPoolClients: Gauge;
  approvalsPending: Gauge;
}

let current: AppMetrics | null = null;

/** Dựng registry (gọi lại → trả bản đã có; `reset` dọn để module boot lại không đăng ký trùng). */
export function appMetrics(service = 'appchat'): AppMetrics {
  if (current) return current;
  const registry = new Registry();
  registry.setDefaultLabels({ service });
  collectDefaultMetrics({ register: registry });
  const reg = { registers: [registry] };
  current = {
    registry,
    httpDuration: new Histogram({ name: 'http_request_duration_seconds', help: 'HTTP theo mẫu route', labelNames: ['route', 'method', 'status'], buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], ...reg }),
    actionTotal: new Counter({ name: 'action_total', help: 'Action qua ActionExecutor theo kết quả', labelNames: ['action', 'source', 'result'], ...reg }),
    jobDuration: new Histogram({ name: 'job_duration_seconds', help: 'Job BullMQ theo họ queue', labelNames: ['queue', 'result'], buckets: [0.05, 0.25, 1, 5, 15, 60, 300], ...reg }),
    queueDepth: new Gauge({ name: 'queue_depth', help: 'Số job theo trạng thái', labelNames: ['queue', 'state'], ...reg }),
    outboxLag: new Gauge({ name: 'outbox_lag_seconds', help: 'Tuổi event outbox cũ nhất chưa phát', ...reg }),
    llmLatency: new Histogram({ name: 'llm_request_duration_seconds', help: 'Độ trễ lời gọi model', labelNames: ['provider', 'model', 'purpose'], buckets: [0.25, 1, 2.5, 5, 10, 30, 60], ...reg }),
    llmTokens: new Counter({ name: 'llm_tokens_total', help: 'Token model', labelNames: ['provider', 'model', 'purpose', 'kind'], ...reg }),
    llmErrors: new Counter({ name: 'llm_errors_total', help: 'Lỗi gọi model', labelNames: ['provider', 'model', 'purpose'], ...reg }),
    creditCharged: new Counter({ name: 'credit_charged_total', help: 'Credit đã trừ', labelNames: ['purpose'], ...reg }),
    channelSends: new Counter({ name: 'channel_messages_sent_total', help: 'Tin gửi ra kênh', labelNames: ['channel', 'result'], ...reg }),
    channelAccounts: new Gauge({ name: 'channel_account_status', help: 'Số tài khoản kênh theo trạng thái (gộp, không theo workspace)', labelNames: ['type', 'status'], ...reg }),
    tenantPoolClients: new Gauge({ name: 'tenant_pool_clients', help: 'Số client Prisma tenant đang mở', ...reg }),
    approvalsPending: new Gauge({ name: 'approval_pending', help: 'Yêu cầu duyệt đang chờ (gộp)', ...reg }),
  };
  return current;
}

/** Dọn registry (shutdown / test). */
export function resetMetrics(): void {
  current?.registry.clear();
  current = null;
}

/** Giá trị nhãn tự do (provider / model / route) → chuỗi ngắn an toàn; ngoài tập → `other`. */
export function boundedLabel(v: string | undefined | null, allowed?: ReadonlySet<string>): string {
  if (!v) return 'unknown';
  if (allowed && !allowed.has(v)) return 'other';
  return v.replace(/[^A-Za-z0-9_.:/-]/g, '_').slice(0, 64);
}
