// Ma trận profile_layout.duplicate (TIP-023b): preview Trợ lý (nguồn · tên bản sao + tab bật) → xác nhận (mẫu hệ thống chưa bù seed vẫn nhân
// bản được) · id lạ → 404 · 403 (sales). Scope: cấu hình workspace. Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT_ID, SYSTEM_LAYOUTS } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const src = SYSTEM_LAYOUTS.find((l) => l.id === DEFAULT_LAYOUT_ID)!;

beforeAll(async () => {
  m = await matrix('profile_layout.duplicate');
}, 120_000);
afterAll(() => m?.close());

describe('profile_layout.duplicate', () => {
  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ layout_id: DEFAULT_LAYOUT_ID });
    const name = `${src.name} (bản sao)`;
    expect(preview).toEqual({ summary: `${src.name} · ${name}`, risk: 'config', changes: [{ entity: 'profile_layout', after: { name, tabs: src.tabs().filter((t) => t.enabled).map((t) => t.label) } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).profileLayout.findUniqueOrThrow({ where: { id: done.body.data.result.layout_id } })).name).toBe(name);
  });

  it('id lạ → 404 · 403 sales', async () => {
    expect((await m.act({ layout_id: 'pl_khong_co' })).status).toBe(404);
    expect((await m.act({ layout_id: DEFAULT_LAYOUT_ID }, m.sales)).status).toBe(403);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
