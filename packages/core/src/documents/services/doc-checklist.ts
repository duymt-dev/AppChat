// Bảng kiểm pháp lý trong preview gửi / duyệt chứng từ (templates.md §6, TIP-028b, DC-444) — cảnh báo, KHÔNG chặn (COMMERCE: các bên tự
// thoả thuận). Hai lớp: (1) theo MẪU đã dùng — cùng luật màn sửa mẫu (`legalChecklist`; mẫu rich tính lại từ thân, mẫu DOCX lấy kết quả đã
// lưu lúc soạn); (2) theo DỮ LIỆU THẬT của chứng từ — mẫu có dùng biến của mục mà mọi biến đó trống (vd. "MST {{business.tax_code}}" khi
// DN chưa khai MST) → chưa đạt, `hint: empty:<biến>`. Mẫu thiếu mục → `hint: template`. Dữ liệu chỉ dựng khi có biến cần kiểm.
import type { ChecklistItem } from '@appchat/actions';
import { checklistVars, htmlText, legalChecklist, templateVars, type DocData, type DocKind } from '@appchat/shared';

export interface ChecklistTemplate {
  kind: string;
  source: 'rich' | 'docx';
  bodyHtml: string | null;
  fieldMap: unknown;
  checklistResult: unknown;
}

type Saved = { key: string; ok: boolean };

/** Biến mẫu thực dùng: thân rich → biến `{{…}}`; DOCX → biến đã gán vào vị trí. */
function usedVars(t: ChecklistTemplate): string[] {
  if (t.source === 'rich') return templateVars(t.kind as DocKind, t.bodyHtml ?? '').vars;
  return Array.isArray(t.fieldMap) ? (t.fieldMap as { variable?: unknown }[]).flatMap((f) => (typeof f.variable === 'string' ? [f.variable] : [])) : [];
}

function templateLevel(t: ChecklistTemplate, vars: string[]): Saved[] {
  const kind = t.kind as DocKind;
  if (t.source === 'rich') return legalChecklist(kind, htmlText(t.bodyHtml ?? ''), vars);
  // DOCX: kết quả đã lưu lúc soạn (không đọc lại tệp Word trong preview); mẫu lưu trước khi có bảng kiểm → chấm theo biến đã gán.
  const saved = Array.isArray(t.checklistResult) ? (t.checklistResult as Saved[]) : [];
  return saved.length ? saved : legalChecklist(kind, '', vars);
}

const valueOf = (data: DocData, path: string): string => {
  if (path === 'items') return data.items.length ? 'items' : '';
  const [group, key] = path.split('.');
  return ((data as unknown as Record<string, Record<string, string> | undefined>)[group!]?.[key!] ?? '').trim();
};

export async function docChecklist(t: ChecklistTemplate, data: () => Promise<DocData>): Promise<ChecklistItem[]> {
  const vars = usedVars(t);
  const base = templateLevel(t, vars);
  const probes = base.map((c) => (c.ok ? checklistVars(c.key).filter((v) => vars.includes(v)) : []));
  const filled = probes.some((p) => p.length) ? await data() : null;
  return base.map((c, i) => {
    if (!c.ok) return { code: c.key, ok: false, hint: 'template' };
    const p = probes[i]!;
    if (filled && p.length && p.every((v) => !valueOf(filled, v))) return { code: c.key, ok: false, hint: `empty:${p[0]}` };
    return { code: c.key, ok: true };
  });
}
