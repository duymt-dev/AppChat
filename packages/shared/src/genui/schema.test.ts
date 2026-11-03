// TIP-023c AC1 (shared): schema nhận / chặn từng khối, giới hạn §8, khối `qr`, ô `secret`, ngữ pháp `$ref` đóng.
import { describe, expect, it } from 'vitest';
import { GENUI_LIMITS, checkTree, nodeAt, parseRef, readRef, refsOf, type UiBlock } from './index';

const ref = (r: string) => ({ $ref: r });
const tree = (root: unknown) => ({ version: 1, root });
const ok = (root: unknown) => checkTree(tree(root)).ok;

const SAMPLES: Record<string, UiBlock> = {
  stack: { type: 'stack', children: [{ type: 'text', text: 'a' }] },
  row: { type: 'row', children: [{ type: 'badge', text: 'b' }] },
  section: { type: 'section', title: 'T', children: [{ type: 'text', text: 'x' }] },
  text: { type: 'text', text: 'Doanh thu tăng', tone: 'success' },
  stat: { type: 'stat', label: 'Doanh thu', value: ref('step:2.total'), format: 'money', compare: ref('step:2.prev') },
  stat_group: { type: 'stat_group', stats: [{ type: 'stat', label: 'A', value: ref('step:1.a') }] },
  table: { type: 'table', columns: [{ key: 'code', label: 'Mã' }], rows: ref('step:3.items'), open: { entity: 'quote', id_key: 'id' } },
  list: { type: 'list', items: ['Gọi lại khách', 'Gửi báo giá'] },
  progress: { type: 'progress', label: 'Mục tiêu', value: ref('step:1.done'), max: ref('step:1.target') },
  badge: { type: 'badge', text: 'VIP', tone: 'brand' },
  chart: { type: 'chart', kind: 'column', data: ref('step:4.rows'), x: 'day', y: 'revenue' },
  button: { type: 'button', label: 'Mở', on: { kind: 'ui', command: { type: 'navigate', route: '/quotes' } } },
  button_group: { type: 'button_group', buttons: [{ type: 'button', label: 'Gắn thẻ', on: { kind: 'action', action_id: 'contact.tag', input: { ids: ['x'] } } }] },
  form: { type: 'form', action_id: 'channel.email.connect', fields: [{ name: 'imap_host', value: 'imap.x.vn' }, { name: 'password', secret: true }] },
  qr: { type: 'qr', login: ref('step:1.login') },
};

describe('khối hợp lệ', () => {
  it.each(Object.entries(SAMPLES))('%s', (_n, b) => expect(ok(b)).toBe(true));
});

describe('chặn', () => {
  it('khối lạ / ô lạ (html, style, color, url)', () => {
    expect(ok({ type: 'html', html: '<b>x</b>' })).toBe(false);
    expect(ok({ type: 'text', text: 'x', style: 'color:red' })).toBe(false);
    expect(ok({ type: 'badge', text: 'x', color: '#f00' })).toBe(false);
    expect(ok({ type: 'text', text: 'x', href: 'https://evil' })).toBe(false);
    expect(checkTree({ version: 1, root: SAMPLES.text, extra: 1 }).ok).toBe(false);
  });

  it('số liệu do model viết (không $ref) → chặn', () => {
    expect(ok({ type: 'stat', label: 'Doanh thu', value: 120000000 })).toBe(false);
    expect(ok({ type: 'stat', label: 'Doanh thu', value: '120tr' })).toBe(false);
    expect(ok({ type: 'table', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] })).toBe(false);
    expect(ok({ type: 'chart', kind: 'line', data: [{ x: 1 }], x: 'x', y: 'y' })).toBe(false);
  });

  it('tone ngoài danh sách, chart kind lạ, nút loại khác ui / action', () => {
    expect(ok({ type: 'text', text: 'x', tone: 'purple' })).toBe(false);
    expect(ok({ type: 'chart', kind: 'pie', data: ref('step:1.a'), x: 'a', y: 'b' })).toBe(false);
    expect(ok({ type: 'button', label: 'x', on: { kind: 'http', url: '/v1/x' } })).toBe(false);
    expect(ok({ type: 'button', label: 'x', on: { kind: 'ui', command: { type: 'navigate', route: 'https://evil' } } })).toBe(false);
  });

  it('form không action_id → chặn', () => {
    expect(ok({ type: 'form', fields: [{ name: 'a' }] })).toBe(false);
  });

  it('giới hạn §8: độ sâu 4, 30 khối, 6 cột, 4 nút', () => {
    const deep = { type: 'stack', children: [{ type: 'stack', children: [{ type: 'stack', children: [{ type: 'stack', children: [{ type: 'text', text: 'x' }] }] }] }] };
    expect(checkTree(tree(deep))).toMatchObject({ ok: false, issues: [expect.stringContaining('depth_exceeded')] });
    const many = { type: 'stack', children: Array.from({ length: 15 }, () => ({ type: 'row', children: [{ type: 'text', text: 'x' }] })) };
    expect(checkTree(tree(many))).toMatchObject({ ok: false, issues: [expect.stringContaining('blocks_exceeded')] });
    const cols = Array.from({ length: GENUI_LIMITS.tableColumns + 1 }, (_, i) => ({ key: `c${i}`, label: 'x' }));
    expect(ok({ type: 'table', columns: cols, rows: ref('step:1.a') })).toBe(false);
    const btn = SAMPLES.button;
    expect(ok({ type: 'button_group', buttons: Array(5).fill(btn) })).toBe(false);
    expect(ok({ type: 'button_group', buttons: Array(4).fill(btn) })).toBe(true);
  });
});

describe('$ref', () => {
  it('ngữ pháp đóng — chặn JSONPath, prototype, run khác', () => {
    expect(parseRef('step:3.rows')).toEqual({ step: 3, path: ['rows'] });
    expect(parseRef('step:3.items.0.total')).toEqual({ step: 3, path: ['items', 0, 'total'] });
    for (const bad of ['$.rows', 'step:3..rows', 'step:3.__proto__', 'step:3.constructor.x', 'run:abc:step:1', 'step:3[0]', 'step:x.rows']) expect(parseRef(bad)).toBeNull();
    expect(ok({ type: 'stat', label: 'x', value: ref('step:1.__proto__') })).toBe(false);
  });

  it('readRef chỉ đọc own property; thiếu → undefined', () => {
    const outputs = new Map<number, unknown>([[2, { total: '1000', items: [{ code: 'BG-1' }] }]]);
    expect(readRef(outputs, 'step:2.total')).toBe('1000');
    expect(readRef(outputs, 'step:2.items.0.code')).toBe('BG-1');
    expect(readRef(outputs, 'step:2.toString')).toBeUndefined();
    expect(readRef(outputs, 'step:9.total')).toBeUndefined();
  });

  it('refsOf gom mọi ref; nodeAt theo path', () => {
    const root: UiBlock = { type: 'stack', children: [SAMPLES.stat!, SAMPLES.qr!, SAMPLES.table!] };
    expect(refsOf(root).sort()).toEqual(['step:1.login', 'step:2.prev', 'step:2.total', 'step:3.items']);
    expect(nodeAt(root, '1')).toEqual(SAMPLES.qr);
    expect(nodeAt(root, '7')).toBeUndefined();
    expect(nodeAt(root, 'a')).toBeUndefined();
  });
});
