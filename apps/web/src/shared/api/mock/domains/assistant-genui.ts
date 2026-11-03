// Mock lượt Trợ lý có cây GenUI (TIP-023c G1/G2): câu hỏi khớp `fixtures/.../<module>.json → genui[]` → chữ dẫn + phần `ui` (cây + refs
// mẫu + intent cho mọi node action — mock coi người xem có quyền; transport mock bắt xem trước khi có intent như server). Drawer theo màn
// (`surface: drawer`) tìm cây của module theo route trước, rồi tới cây chung của màn Trợ lý.
import { walkTree, type GenUiPart, type UiTree } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/assistant.json';
import customers from '../../../../../../../fixtures/prototype-parity/customers.json';

interface GenUiFixture {
  re: string;
  lead: string;
  tree: unknown;
  refs: unknown;
}

/** Cây theo module (route đầu) — mỗi module ≥ 3 cây compact (standard §12). */
const BY_MODULE: Record<string, readonly GenUiFixture[]> = {
  customers: customers.genui,
};

let seq = 0;

/** Intent giả cho từng node action / form (đường dẫn node → handle). */
function intentsOf(tree: UiTree): Record<string, string> {
  const out: Record<string, string> = {};
  walkTree(tree.root, (b, path) => {
    if ((b.type === 'button' && b.on.kind === 'action') || b.type === 'form') out[path] = `mock_intent_${(++seq).toString(36).padStart(12, '0')}`;
  });
  return out;
}

const moduleOf = (route?: string) => route?.split(/[/?#]/)[1] ?? '';

export function genUiReply(low: string, route?: string) {
  const pick = (list: readonly GenUiFixture[] | undefined) => list?.find((g) => new RegExp(g.re).test(low));
  const hit = pick(BY_MODULE[moduleOf(route)]) ?? pick(fixture.genui);
  if (!hit) return null;
  const tree = hit.tree as UiTree;
  const part: GenUiPart = { type: 'ui', tree, run_id: `run_mock_${++seq}`, refs: hit.refs as Record<string, unknown>, intents: intentsOf(tree) };
  return [{ type: 'delta' as const, text: hit.lead }, part];
}
