// TIP-038 pha 3 (AC07) — phần thuần của xuất danh sách: workbook exceljs mở lại được, chuỗi bắt đầu = + - @ là CHỮ (không ô công thức), tiền
// VND bigint giữ đủ chữ số, 0 dòng vẫn có hàng tiêu đề, cột tuỳ biến chỉ key được thấy + bật "Xuất", ngày theo giờ workspace, dấu quyền đổi
// khi scope / nhóm / định nghĩa trường đổi.
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { authzForRole } from '@appchat/shared';
import {
  customCell,
  day,
  exportCustomKeys,
  money,
  stamp,
  withCustom,
  workbook,
} from '../src/insights/exports/export-columns';
import { exportStamp } from '../src/insights/exports/export-runner';

async function* once<T>(xs: T[]) {
  yield xs;
}
const read = async (buf: Buffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb.worksheets[0]!;
};

describe('workbook', () => {
  it('ô chữ nguy hiểm vẫn là chữ, không công thức; bigint giữ đủ chữ số; có chú thích + tiêu đề', async () => {
    const big = 123_456_789_012_345_678n;
    const buf = await workbook(
      'Báo giá',
      'Báo giá · Asia/Ho_Chi_Minh',
      [
        { key: 'a', header: 'Mã' },
        { key: 'b', header: 'Tổng (VND)' },
        { key: 'c', header: 'Số' },
      ],
      once([
        ['=1+1', money(big), 3],
        ['+SUM(A1)', '-2', null],
        ['@cmd', '@', 0],
      ]),
    );
    const ws = await read(buf);
    expect(ws.getRow(1).getCell(1).value).toBe('Báo giá · Asia/Ho_Chi_Minh');
    expect(ws.getRow(2).values).toEqual([undefined, 'Mã', 'Tổng (VND)', 'Số']);
    for (let r = 3; r <= 5; r++) ws.getRow(r).eachCell((c) => expect(c.formula).toBeUndefined());
    expect(ws.getRow(3).getCell(1).value).toBe('=1+1');
    expect(ws.getRow(3).getCell(2).value).toBe('123456789012345678');
    expect(ws.getRow(4).getCell(1).value).toBe('+SUM(A1)');
    expect(ws.getRow(5).getCell(1).value).toBe('@cmd');
    expect(ws.getRow(4).getCell(3).value).toBeNull();
  });

  it('0 dòng → chỉ chú thích + tiêu đề', async () => {
    const ws = await read(await workbook('Ticket', 'n', [{ key: 'a', header: 'Mã' }], once([])));
    expect(ws.rowCount).toBe(2);
  });
});

describe('ô + cột', () => {
  it('ngày giờ theo giờ workspace; cột @db.Date giữ nguyên ngày; tuỳ biến mảng nối', () => {
    expect(stamp(new Date('2026-11-05T18:30:00Z'), 'Asia/Ho_Chi_Minh')).toBe('2026-11-06 01:30');
    expect(day(new Date('2026-11-30T00:00:00Z'))).toBe('2026-11-30');
    expect(customCell({ tags: ['a', 'b'], n: 3, s: '' }, 'tags')).toBe('a; b');
    expect(customCell({ n: 3 }, 'n')).toBe(3);
    expect(customCell({ s: '' }, 's')).toBeNull();
    expect(
      withCustom([{ key: 'code', header: 'Mã' }], [{ key: 'size', label: 'Cỡ' }]).map((c) => c.key),
    ).toEqual(['code', 'cf.size']);
  });

  it('khoá tuỳ biến: chỉ key vai trò đọc được VÀ bật "Xuất"', async () => {
    const defs = [
      { key: 'open', label: 'Mở', roles: [], ai: false, sys: false, visibleIn: { export: true } },
      {
        key: 'secret',
        label: 'Bí mật',
        roles: ['owner'],
        ai: false,
        sys: false,
        visibleIn: { export: true },
      },
      { key: 'noexp', label: 'Không xuất', roles: [], ai: false, sys: false, visibleIn: { export: false } },
    ];
    const db = { customFieldDef: { findMany: async () => defs } } as never;
    expect((await exportCustomKeys(db, 'quote', authzForRole('sales', 'u1'))).map((c) => c.key)).toEqual([
      'open',
    ]);
    expect(
      (await exportCustomKeys(db, 'quote', { ...authzForRole('owner', 'u0'), isOwner: true })).map(
        (c) => c.key,
      ),
    ).toEqual(['open', 'secret']);
    expect(await exportCustomKeys(db, null, authzForRole('sales', 'u1'))).toEqual([]);
  });

  it('dấu quyền đổi khi scope / nhóm đổi', async () => {
    const db = { customFieldDef: { findMany: async () => [] } } as never;
    const own = authzForRole('sales', 'u1');
    const a = await exportStamp(db, 'quote.export', own);
    expect(await exportStamp(db, 'quote.export', own)).toBe(a);
    expect(await exportStamp(db, 'quote.export', { ...own, scope: { ...own.scope, sales: 'all' } })).not.toBe(
      a,
    );
    expect(await exportStamp(db, 'quote.export', { ...own, teamIds: ['t1'] })).not.toBe(a);
    expect(await exportStamp(db, 'ticket.export', { ...own, scope: { ...own.scope, sales: 'all' } })).toBe(
      await exportStamp(db, 'ticket.export', own),
    );
  });
});
