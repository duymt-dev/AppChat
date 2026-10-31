// TIP-020 (unit): parse tài liệu kho tri thức (pdf / docx / xlsx / csv / md / txt / html) → khối có cấu trúc; định dạng lạ / tệp hỏng
// → ParseError; nhận loại theo đuôi; dung lượng hiển thị; visibility theo người hiệu lực (D54). Tệp mẫu: test/fixtures/kb (LibreOffice).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { ParseError, csvBlocks, fmtSize, htmlBlocks, kbVisibility, kindOf, markdownBlocks, parseDocument } from '../src';

const fx = (n: string) => readFileSync(join(import.meta.dirname, 'fixtures', 'kb', n));
const texts = (b: { type: string; text?: string }[]) => b.map((x) => x.text ?? '').join(' ');

describe('parse', () => {
  it('docx: đề mục + đoạn + bảng (hàng đầu là tiêu đề)', async () => {
    const b = await parseDocument('docx', fx('policy.docx'));
    expect(b).toEqual(expect.arrayContaining([{ type: 'heading', level: 2, text: 'Đổi trả' }]));
    expect(texts(b)).toContain('đổi liệu trình trong 7 ngày');
    expect(b.find((x) => x.type === 'table')).toMatchObject({ header: ['Dịch vụ', 'Thời lượng'], rows: [['HIFU', '60 phút'], ['Chăm sóc da', '45 phút']] });
  });

  it('pdf: ra chữ tiếng Việt', async () => {
    const b = await parseDocument('pdf', fx('policy.pdf'));
    expect(texts(b)).toMatch(/Bảo hành|bảo hành 12 tháng/);
  });

  it('xlsx / csv: mỗi dòng một khối kèm tên cột (csv có ; và ngoặc kép)', async () => {
    const x = await parseDocument('xlsx', fx('services.xlsx'));
    expect(x[0]).toEqual({ type: 'row', columns: ['Tên', 'Thời lượng', 'Mô tả'], values: ['HIFU', '60 phút', 'Nâng cơ không phẫu thuật'], row: 2, sheet: 'Dịch vụ' });
    expect(csvBlocks(fx('services.csv').toString('utf8'))).toEqual([
      { type: 'row', columns: ['Tên', 'Thời lượng'], values: ['HIFU', '60 phút'], row: 2 },
      { type: 'row', columns: ['Tên', 'Thời lượng'], values: ['Chăm sóc da; cơ bản', '45 phút'], row: 3 },
    ]);
  });

  it('md: # đề mục, bảng | |, đoạn theo dòng trống; html bỏ script / nav', () => {
    const md = markdownBlocks('# Giờ mở cửa\n\nThứ 2 – CN: 8h–20h.\n\n| Ngày | Giờ |\n|---|---|\n| Lễ | 9h–17h |\n');
    expect(md).toEqual([
      { type: 'heading', level: 1, text: 'Giờ mở cửa' },
      { type: 'para', text: 'Thứ 2 – CN: 8h–20h.' },
      { type: 'table', header: ['Ngày', 'Giờ'], rows: [['Lễ', '9h–17h']] },
    ]);
    expect(htmlBlocks('<nav>Menu</nav><script>x()</script><p>Spa &amp; Clinic</p>')).toEqual([{ type: 'para', text: 'Spa & Clinic' }]);
  });

  it('định dạng lạ → unsupported; tệp hỏng → corrupt; rỗng → empty', async () => {
    await expect(parseDocument('pptx', Buffer.from('x'))).rejects.toMatchObject({ reason: 'unsupported' });
    await expect(parseDocument('docx', Buffer.from('không phải zip'))).rejects.toBeInstanceOf(ParseError);
    await expect(parseDocument('docx', Buffer.from('không phải zip'))).rejects.toMatchObject({ reason: 'corrupt' });
    await expect(parseDocument('txt', Buffer.from('   \n  '))).rejects.toMatchObject({ reason: 'empty' });
  });

  it('kindOf theo đuôi / mime; fmtSize', () => {
    expect([kindOf('a.PDF'), kindOf('b.docx'), kindOf('c.xlsx'), kindOf('d.csv'), kindOf('e.md'), kindOf('f.txt'), kindOf('g.pptx'), kindOf('h', 'text/html')]).toEqual(['pdf', 'docx', 'xlsx', 'csv', 'md', 'txt', null, 'html']);
    expect([fmtSize(0), fmtSize(512), fmtSize(2048), fmtSize(12.4 * 1024 * 1024)]).toEqual(['—', '512 B', '2 KB', '12.4 MB']);
  });
});

describe('kb.search visibility (D54)', () => {
  it('kb.manage / Owner → public + internal; người khác → public; agent trực kênh → public', () => {
    expect(kbVisibility({ source: 'ui', authz: authzForRole('owner', 'u') })).toEqual(['public', 'internal']);
    expect(kbVisibility({ source: 'assistant', onBehalfOfUserId: 'u', authz: authzForRole('sales', 'u') })).toEqual(['public']);
    expect(kbVisibility({ source: 'agent', authz: authzForRole('owner', 'u') })).toEqual(['public']);
  });
});
