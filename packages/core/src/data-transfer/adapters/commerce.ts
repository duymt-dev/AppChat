// Adapter nhập chứng từ nháp (TIP-038b P2, DC-374): báo giá / đơn gom dòng theo khoá nhóm (header + dòng hàng — MỘT `quote.create` /
// `order.create` nguyên tử mỗi nhóm, không nửa đơn); hợp đồng / đề nghị thanh toán một dòng = một `contract.create` / `invoice.create`.
// Chỉ tạo NHÁP qua action có sẵn — không gửi / ký / xác nhận / ghi nhận tiền / trừ kho / cộng điểm (action tạo không làm các việc đó).
// Khách: tra trong phạm vi GHI (party.ts). Mã hàng (SKU) → `product_id` nếu có trong danh mục; giá lấy ĐÚNG giá tệp (không tự sửa) — lệch
// giá danh mục ghi cảnh báo `unit_price: catalog_diff` ở dòng (không chặn; ngưỡng duyệt báo giá vẫn do action kiểm — COMMERCE).
// Nhập lại cùng tệp đã ghi → `duplicate` (khoá dòng ổn định đã applied ở kế hoạch trước của cùng người).
import type { TenantDb } from '@appchat/db';
import type { TransferTarget as TransferEntity } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CheckedRow } from '../services/validation';
import { POLICIES, allows } from '../../authz/data-access';
import { partyResolver } from './party';
import type { Classifier, PendingRow, RowCheck, UnitResult, WriteUnit } from './types';

const HEADER: Record<'quote' | 'order', string[]> = {
  quote: ['valid_days', 'payment_terms', 'note'],
  order: ['deposit_amount', 'note'],
};
const groupOf = (r: CheckedRow) => (r.data.group ? `g:${r.data.group}` : `#${r.rowNo}`);

/** SKU → sản phẩm còn sống (id + giá danh mục) — một truy vấn cho cả tệp. */
async function productsBySku(tx: TenantTx, rows: CheckedRow[]) {
  const skus = [...new Set(rows.map((r) => r.data.item_sku?.toLowerCase()).filter((x): x is string => !!x))];
  if (!skus.length) return new Map<string, { id: string; price: bigint }>();
  const found = await tx.$queryRaw<{ id: string; code: string; price: bigint }[]>`
    SELECT id, code, price FROM product WHERE lower(code) = ANY(${skus}::text[]) AND deleted_at IS NULL`;
  return new Map(found.map((p) => [p.code.toLowerCase(), { id: p.id, price: p.price }]));
}

/** Phân loại chung: khách (mọi thực thể chứng từ) + dòng hàng (grouped). Nhóm có một dòng lỗi → cả nhóm lỗi (không ghi nửa đơn). */
export function classifyDocs(entity: TransferEntity): Classifier {
  const grouped = entity === 'quote' || entity === 'order';
  return async (tx, who, rows) => {
    const party = partyResolver(tx, who);
    const skus = grouped ? await productsBySku(tx, rows) : new Map();
    const firstOf = new Map<string, CheckedRow>();
    for (const r of rows) {
      r.groupKey = grouped ? groupOf(r) : null;
      const head = grouped ? (firstOf.get(r.groupKey!) ?? (firstOf.set(r.groupKey!, r), r)) : r;
      // Khách / thông tin đầu chứng từ lấy ở dòng đầu nhóm; dòng sau ghi khác → lỗi rõ (không chọn hộ).
      if (head !== r)
        for (const k of ['contact_phone', 'contact_email', 'contact_code', ...HEADER[entity as 'quote']])
          if (r.data[k] && r.data[k] !== head.data[k]) r.errors[k] = 'group_mismatch';
      if (head === r) {
        const p = await party(r.data);
        if ('error' in p) r.errors.contact = p.error;
        else r.data.contact_id = p.contactId;
        if (entity === 'invoice' && r.data.order_code) await linkOrder(tx, who, r);
      }
      if (grouped && r.data.item_sku) {
        const p = skus.get(r.data.item_sku.toLowerCase());
        if (!p) r.errors.item_sku = 'not_found';
        else {
          r.data.product_id = p.id;
          if (r.data.unit_price && BigInt(r.data.unit_price) !== p.price)
            r.errors.unit_price_warning = 'catalog_diff';
        }
      }
      if (grouped && r.data.qty && !(Number(r.data.qty) > 0)) r.errors.qty = 'invalid';
    }
    const hard = (r: CheckedRow) => Object.keys(r.errors).some((k) => !k.endsWith('_warning'));
    const badGroups = new Set(rows.filter((r) => hard(r) && r.groupKey).map((r) => r.groupKey!));
    return rows.map((r): RowCheck => {
      if (hard(r)) return 'invalid';
      if (!r.groupKey || !badGroups.has(r.groupKey)) return 'valid';
      r.errors.group = 'has_invalid_row'; // dòng đúng nhưng nhóm có dòng lỗi — không ghi nửa chứng từ
      return 'invalid';
    });
  };
}

/** Đề nghị thanh toán theo mã đơn: đơn người nhập GHI được (scope sales), cùng khách — không thấy / khác khách → lỗi theo trường. */
async function linkOrder(tx: TenantTx, who: Parameters<Classifier>[1], r: CheckedRow) {
  const o = await tx.order.findFirst({
    where: { code: r.data.order_code, deletedAt: null },
    select: { id: true, contactId: true, ownerUserId: true, teamId: true },
  });
  if (
    !o ||
    !(await allows(tx, who.authz, POLICIES.sales, 'write', {
      owner: o.ownerUserId,
      team: o.teamId,
      contact: o.contactId,
    }))
  )
    r.errors.order_code = 'not_found';
  else if (r.data.contact_id && o.contactId !== r.data.contact_id) r.errors.order_code = 'contact_mismatch';
  else r.data.order_id = o.id;
}

const line = (d: Record<string, string>) => ({
  ...(d.product_id ? { product_id: d.product_id } : {}),
  name: d.item_name!,
  qty: Number(d.qty),
  unit_price: d.unit_price!,
  tax_rate: Number(d.tax_rate) as 0 | 5 | 8 | 10,
});

/** Dòng chờ → đơn vị ghi: grouped = một nhóm một chứng từ; còn lại một dòng một chứng từ. */
export function docUnits(entity: TransferEntity) {
  return (rows: PendingRow[]): WriteUnit[] => {
    if (entity === 'quote' || entity === 'order') {
      const groups = new Map<string, PendingRow[]>();
      for (const r of rows)
        groups.set(r.groupKey ?? `#${r.rowNo}`, [...(groups.get(r.groupKey ?? `#${r.rowNo}`) ?? []), r]);
      return [...groups.values()].map((g) => {
        const h = g[0]!.data;
        const head =
          entity === 'quote'
            ? {
                ...(h.valid_days ? { valid_days: Number(h.valid_days) } : {}),
                ...(h.payment_terms ? { payment_terms: h.payment_terms } : {}),
              }
            : { ...(h.deposit_amount ? { deposit_amount: h.deposit_amount } : {}) };
        return {
          rows: g,
          key: `r${g[0]!.rowNo}`,
          input: {
            contact_id: h.contact_id,
            items: g.map((r) => line(r.data)),
            ...head,
            ...(h.note ? { note: h.note } : {}),
          },
        };
      });
    }
    return rows.map((r) => {
      const d = r.data;
      const input =
        entity === 'contract'
          ? {
              contact_id: d.contact_id,
              kind: d.kind,
              value: d.value,
              ...pick(d, ['title', 'number', 'start_date', 'end_date', 'note']),
            }
          : {
              contact_id: d.contact_id,
              kind: d.kind,
              amount: d.amount,
              ...(d.order_id ? { order_id: d.order_id } : {}),
              ...pick(d, ['due_date', 'title', 'note']),
            };
      return { rows: [r], key: `r${r.rowNo}`, input };
    });
  };
}

const pick = (d: Record<string, string>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => d[k]).map((k) => [k, d[k]!]));

const ID_KEY: Record<string, string> = {
  quote: 'quote_id',
  order: 'order_id',
  contract: 'contract_id',
  invoice: 'invoice_id',
};

/** Kết quả `{ <entity>_id, code }` → mọi dòng của đơn vị cùng trỏ một chứng từ. */
export function docResolve(entity: TransferEntity) {
  return async (_db: TenantDb, unit: WriteUnit, result: unknown): Promise<UnitResult> => {
    const r = result as Record<string, string>;
    const hit = r[ID_KEY[entity]!] ? { id: r[ID_KEY[entity]!]!, code: r.code ?? null } : null;
    return new Map(unit.rows.map((x) => [x.id, hit]));
  };
}
