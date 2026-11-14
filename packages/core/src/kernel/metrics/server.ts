// Cổng `/metrics` (TIP-045b annex B): worker mỗi vai trò mở listener RIÊNG trên 127.0.0.1 (cổng cấu hình, không đụng nhau giữa vai trò)
// — chỉ Prometheus cùng máy đọc; API trả `/metrics` qua controller chỉ khi người gọi là loopback HOẶC mang token nội bộ (`METRICS_TOKEN`).
// Không bao giờ phục vụ qua reverse proxy công khai. Đóng listener khi shutdown.
import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { appMetrics } from './registry';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Người gọi được đọc metric: loopback mà KHÔNG qua proxy (không có X-Forwarded-For), hoặc Bearer = METRICS_TOKEN. */
export function metricsAllowed(req: IncomingMessage, token: string | undefined): boolean {
  const auth = req.headers.authorization;
  if (token && auth?.startsWith('Bearer ')) {
    const a = Buffer.from(auth.slice(7));
    const b = Buffer.from(token);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return LOOPBACK.has(req.socket.remoteAddress ?? '') && !req.headers['x-forwarded-for'];
}

type Sampler = () => Promise<void> | void;
const samplers = new Set<Sampler>();

/** Đăng ký hàm đọc gauge lúc scrape (độ sâu queue, client tenant…) — trả hàm gỡ. Lỗi một sampler không làm hỏng lượt scrape. */
export function onScrape(fn: Sampler): () => void {
  samplers.add(fn);
  return () => void samplers.delete(fn);
}

export async function renderMetrics(): Promise<{ body: string; contentType: string }> {
  await Promise.all([...samplers].map((f) => (async () => f())().catch(() => undefined)));
  const m = appMetrics();
  return { body: await m.registry.metrics(), contentType: m.registry.contentType };
}

/** Listener 127.0.0.1:<port> chỉ phục vụ GET /metrics (worker). Port 0 / không đặt → không mở. */
export async function startMetricsServer(port: number | undefined, token?: string): Promise<Server | null> {
  if (!port) return null;
  const srv = createServer((req, res) => {
    if (req.method !== 'GET' || (req.url ?? '').split('?')[0] !== '/metrics' || !metricsAllowed(req, token)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    renderMetrics().then(
      (r) => {
        res.setHeader('content-type', r.contentType);
        res.end(r.body);
      },
      () => {
        res.statusCode = 500;
        res.end();
      },
    );
  });
  await new Promise<void>((ok, no) => {
    srv.once('error', no);
    srv.listen(port, '127.0.0.1', () => ok());
  });
  return srv;
}
