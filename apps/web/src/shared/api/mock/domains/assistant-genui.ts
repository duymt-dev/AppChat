// Mock lượt Trợ lý có cây GenUI (TIP-023c G1): câu hỏi khớp `fixtures/.../assistant.json → genui[]` → chữ dẫn + phần `ui` (cây + refs
// mẫu + intent cho mọi node action — mock coi người xem có quyền; transport mock bắt xem trước khi có intent như server).
import { walkTree, type GenUiPart, type UiTree } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/assistant.json';

let seq = 0;

/** Intent giả cho từng node action / form (đường dẫn node → handle). */
function intentsOf(tree: UiTree): Record<string, string> {
  const out: Record<string, string> = {};
  walkTree(tree.root, (b, path) => {
    if ((b.type === 'button' && b.on.kind === 'action') || b.type === 'form') out[path] = `mock_intent_${(++seq).toString(36).padStart(12, '0')}`;
  });
  return out;
}

export function genUiReply(low: string) {
  const hit = fixture.genui.find((g) => new RegExp(g.re).test(low));
  if (!hit) return null;
  const tree = hit.tree as UiTree;
  const part: GenUiPart = { type: 'ui', tree, run_id: `run_mock_${++seq}`, refs: hit.refs as Record<string, unknown>, intents: intentsOf(tree) };
  return [{ type: 'delta' as const, text: hit.lead }, part];
}
