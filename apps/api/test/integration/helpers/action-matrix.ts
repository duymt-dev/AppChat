// Khung ma trận theo action (TIP-023b SPEC B.3): mỗi file `actions/<id>.action.test.ts` dựng một harness thật (Postgres + Memurai), gọi
// executor qua HTTP `POST /v1/actions/:id`, và chạy các ô chuẩn — happy · 403 thiếu quyền · ngoài scope · nguồn (ui / assistant / agent)
// · idempotency · (undo / trạng thái khi áp dụng). Ô không áp dụng khai lý do theo ActionDef (`na`) — không skip âm thầm.
import { getAction, type ActionDef } from '@appchat/actions';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from '../setup';

export type Who = { id: string; token: string };
export type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Matrix {
  h: Harness;
  def: ActionDef;
  /** Owner (harness) · sales (scope own) · cs (không quyền bán hàng). */
  sales: Who;
  cs: Who;
  act(input: unknown, who?: Who, headers?: Record<string, string>): Promise<Res>;
  /** Gọi action khác để dựng dữ liệu (luôn qua executor). */
  seed(id: string, input: unknown, who?: Who): Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** DB tenant (system) — chỉ để dựng dữ liệu không có action tạo (hội thoại / run từ kênh, pipeline). */
  db(): Promise<TenantDb>;
  close(): Promise<void>;
}

const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json() });
const as = (u?: Who): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});

export async function matrix(actionId: string): Promise<Matrix> {
  const def = getAction(actionId);
  if (!def) throw new Error(`action không có trong registry: ${actionId}`);
  const h = await startApi();
  const [sales, cs] = [await h.member('sales'), await h.member('cs')];
  let resolver: TenantDbResolver | undefined;
  const post = (id: string, input: unknown, who?: Who, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who), ...headers }).then(json);
  return {
    h,
    def,
    sales,
    cs,
    act: (input, who, headers) => post(actionId, input, who, headers),
    async seed(id, input, who) {
      const r = await post(id, input, who);
      if (r.status !== 200) throw new Error(`seed ${id} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
      return r.body.data.result;
    },
    db: () => (resolver ??= new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! })).get(TenantContexts.system(h.ws, 'matrix')),
    close: async () => {
      await resolver?.close();
      await h.close();
    },
  };
}

/** Ô không áp dụng: lý do phải dẫn từ ActionDef (risk / undo / bulk / không có trạng thái). */
export function na(def: ActionDef, cell: 'undo' | 'state' | 'idempotency' | 'bulk'): string {
  if (cell === 'undo' && !def.undo) return `${def.id}: không khai undo`;
  if (cell === 'idempotency' && def.risk === 'read') return `${def.id}: risk read — không ghi, gọi lặp không có hiệu ứng`;
  if (cell === 'bulk' && !def.bulk) return `${def.id}: không phải action hàng loạt`;
  if (cell === 'state' && def.risk === 'read') return `${def.id}: risk read — không chuyển trạng thái`;
  throw new Error(`${def.id}: ô ${cell} áp dụng được — phải viết test, không đánh dấu không áp dụng`);
}
