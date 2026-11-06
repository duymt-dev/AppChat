// TIP-023c 8c / AC 9 (unit, DB giả trong bộ nhớ): guard tệp đính kèm của Trợ lý — tệp người khác / workspace khác (không có trong DB
// tenant hiện tại) / sai purpose / hết hạn / mime lạ / quá cỡ → 422 TRƯỚC model, không lộ storage key; tệp hợp lệ chỉ đưa metadata;
// extension domain đăng ký theo mime được gợi ý cho model.
import { afterEach, describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { ATTACHMENT_RULE, resolveAttachments } from '../src/ai/assistant/genui/attachments';
import { registerAttachmentExtension, unregisterAttachmentExtension } from '../src/ai/assistant/genui/extension-registry';
import { checkFile, DEFAULT_FILE_TTL_MS } from '../src/kernel/files/file-access';

const NOW = new Date('2026-11-03T08:00:00Z');
const ME = '00000000-0000-7000-8000-000000000001';
const OTHER = '00000000-0000-7000-8000-000000000002';
const id = (n: number) => `00000000-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`;

type Row = { id: string; name: string; mime: string; size: bigint; uploadedBy: string | null; purpose: string; confirmed: boolean; createdAt: Date; storageKey: string };
const rows: Row[] = [
  { id: id(1), name: 'bang-gia.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 2048n, uploadedBy: ME, purpose: 'attachment', confirmed: false, createdAt: NOW, storageKey: 'ws/secret/1' },
  { id: id(2), name: 'cua-nguoi-khac.pdf', mime: 'application/pdf', size: 10n, uploadedBy: OTHER, purpose: 'attachment', confirmed: false, createdAt: NOW, storageKey: 'ws/secret/2' },
  { id: id(3), name: 'kb.pdf', mime: 'application/pdf', size: 10n, uploadedBy: ME, purpose: 'kb', confirmed: false, createdAt: NOW, storageKey: 'ws/secret/3' },
  { id: id(4), name: 'cu.png', mime: 'image/png', size: 10n, uploadedBy: ME, purpose: 'attachment', confirmed: false, createdAt: new Date(NOW.getTime() - DEFAULT_FILE_TTL_MS - 1), storageKey: 'ws/secret/4' },
  { id: id(5), name: 'run.exe', mime: 'application/x-msdownload', size: 10n, uploadedBy: ME, purpose: 'attachment', confirmed: false, createdAt: NOW, storageKey: 'ws/secret/5' },
  { id: id(6), name: 'anh.png', mime: 'image/png', size: 64n, uploadedBy: ME, purpose: 'attachment', confirmed: false, createdAt: NOW, storageKey: 'ws/secret/6' },
];
const db = {
  file: {
    findUnique: async ({ where, select }: { where: { id: string }; select: Record<string, boolean> }) => {
      const r = rows.find((x) => x.id === where.id);
      return r ? Object.fromEntries(Object.keys(select).map((k) => [k, r[k as keyof Row]])) : null;
    },
  },
} as never;

afterEach(() => unregisterAttachmentExtension('crm.import'));

describe('guard tệp đính kèm', () => {
  it('từng lý do từ chối; id tệp workspace khác (không có trong DB tenant) → not_found', async () => {
    const reason = async (n: number | string) => {
      const r = await checkFile(db, ME, typeof n === 'number' ? id(n) : n, ATTACHMENT_RULE, NOW);
      return 'denied' in r ? r.denied : 'ok';
    };
    expect(await reason(1)).toBe('ok');
    expect(await reason(2)).toBe('forbidden');
    expect(await reason(3)).toBe('purpose');
    expect(await reason(4)).toBe('expired');
    expect(await reason(5)).toBe('mime');
    expect(await reason(id(99))).toBe('not_found');
    expect(await reason('../../etc/passwd')).toBe('not_found');
    expect(await checkFile(db, ME, id(6), { ...ATTACHMENT_RULE, maxBytes: 10 }, NOW)).toEqual({ denied: 'too_large' });
  });

  it('một tệp bị từ chối → 422 cả lượt (trước model), lỗi nêu tệp + lý do, không có storage key', async () => {
    const err = await resolveAttachments(db, ME, [id(1), id(2)], NOW).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ httpStatus: 422, fields: { [`attachments.${id(2)}`]: 'forbidden' } });
    expect(JSON.stringify(err)).not.toContain('ws/secret');
  });

  it('tệp hợp lệ: chỉ metadata (không storage key / URL); bỏ trùng; extension theo mime', async () => {
    registerAttachmentExtension({ key: 'crm.import', mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'], hint: 'Nhập khách hàng từ bảng tính' });
    const out = await resolveAttachments(db, ME, [id(1), id(6), id(1)], NOW);
    expect(out).toEqual([
      { id: id(1), name: 'bang-gia.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 2048, handlers: ['crm.import'], hints: ['Nhập khách hàng từ bảng tính'] },
      { id: id(6), name: 'anh.png', mime: 'image/png', size: 64 },
    ]);
    expect(JSON.stringify(out)).not.toMatch(/storage|secret|http/);
    expect(await resolveAttachments(db, ME, [], NOW)).toEqual([]);
  });
});
