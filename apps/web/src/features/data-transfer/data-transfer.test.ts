// TIP-038b P4: tệp lỗi (chặn công thức, thoát ngoặc kép / xuống dòng, BOM, giữ 0 đầu SĐT) + lệnh UI `open:transfer_plan` mở đúng kế hoạch.
import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { TRANSFER_MIMES, useTransferPlanCommand } from '@/shared/assistant/data-transfer-command';
import { attachmentUiFor } from '@/shared/assistant/attachment-extensions';
import { csvCell, errorCsv } from './error-file';
import { openTransfer, useTransferUi } from './transfer-store';

afterEach(() => useTransferUi.getState().close());

describe('tệp lỗi nhập', () => {
  it('ô nguy hiểm thành chuỗi, ô có dấu phẩy / ngoặc / xuống dòng được thoát', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+84')).toBe("'+84");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('dòng\nhai')).toBe('"dòng\nhai"');
    expect(csvCell('0987654321')).toBe('0987654321');
  });

  it('mỗi lỗi trường một dòng, cột lấy theo ánh xạ, có BOM', () => {
    const csv = errorCsv(
      { mapping: { phone: 'Điện thoại', full_name: 'Tên' } },
      [{ row_no: 4, data: { full_name: 'An' }, check: 'invalid', errors: { phone: 'invalid', email: 'invalid' }, status: 'pending', result_id: null, result_code: null }],
      ['Dòng', 'Cột', 'Mã', 'Mô tả', 'Giá trị'],
      (c) => `L:${c}`,
    );
    expect(csv.startsWith('﻿Dòng,Cột,Mã,Mô tả,Giá trị\r\n')).toBe(true);
    expect(csv.split('\r\n').slice(1)).toEqual(['4,Điện thoại,invalid,L:invalid,', '4,email,invalid,L:invalid,']);
  });
});

describe('lệnh mở TransferPanel', () => {
  it('open:transfer_plan → host mở đúng kế hoạch; entity khác không bắt', () => {
    renderHook(() => useTransferPlanCommand((id) => openTransfer({ planId: id })));
    expect(dispatchUiCommand({ type: 'open', entity: 'transfer_plan', id: 'p1', view: 'drawer' })).toBe(true);
    expect(useTransferUi.getState()).toMatchObject({ open: true, planId: 'p1' });
    openTransfer({ entity: 'product' });
    expect(useTransferUi.getState()).toMatchObject({ entity: 'product', planId: null });
  });

  it('tệp CSV / XLSX đính kèm có gợi ý "Nhập dữ liệu", ảnh thì không', () => {
    for (const m of TRANSFER_MIMES) expect(attachmentUiFor(m).map((e) => e.key)).toContain('data.import');
    expect(attachmentUiFor('image/png').map((e) => e.key)).not.toContain('data.import');
  });
});
