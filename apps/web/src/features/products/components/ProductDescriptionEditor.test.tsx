// TIP-027b AC2 — trình soạn mô tả: gõ / xuống dòng / xoá qua `beforeinput` gốc đi vào mô hình (không đọc innerHTML), dán chỉ chữ thuần
// (thẻ `<script>` / `<b>` là chữ), 5 nút định dạng có aria-pressed, Ctrl+B / Ctrl+Z, IME chỉ nhận chữ khi kết thúc ghép, giá trị gửi lưu là
// tài liệu dạng chuẩn + phép chiếu chữ thuần khớp. Phần xem: thẻ ngữ nghĩa bằng nút chữ React, không chèn HTML.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { descriptionDocSchema, type DescriptionDoc } from '@appchat/shared';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));

import { ProductDescriptionEditor } from './ProductDescriptionEditor';
import { ProductDescriptionView } from './ProductDescriptionView';
import { useProductDescription, type DescriptionEditorApi } from '../hooks/useProductDescription';

const latest: { ed?: DescriptionEditorApi } = {};
function Host({ doc, plain = '' }: { doc?: DescriptionDoc | null; plain?: string }) {
  const ed = useProductDescription({ doc, plain });
  useEffect(() => {
    latest.ed = ed;
  });
  return <ProductDescriptionEditor ed={ed} />;
}

const area = () => screen.getByTestId('pd-f-desc');
/** beforeinput gốc như trình duyệt (React không giả lập inputType). */
function input(inputType: string, data: string | null = null) {
  const ev = new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true });
  act(() => {
    area().dispatchEvent(ev);
  });
  return ev;
}
const selectAll = () => act(() => latest.ed!.setSel({ anchor: { line: 0, offset: 0 }, focus: { line: latest.ed!.lines.length - 1, offset: 99 } }));

describe('ProductDescriptionEditor', () => {
  afterEach(() => cleanup());

  it('gõ + Enter + xoá lùi qua mô hình; trình duyệt không tự sửa DOM (preventDefault)', () => {
    render(<Host />);
    expect(input('insertText', 'Ab').defaultPrevented).toBe(true);
    input('insertParagraph');
    input('insertText', 'cd');
    input('deleteContentBackward');
    expect(latest.ed!.value).toEqual({ description: 'Ab\nc', description_doc: expect.objectContaining({ type: 'doc' }) });
    expect(area().querySelectorAll('[data-line]')).toHaveLength(2);
  });

  it('dán chỉ lấy text/plain — HTML / script thành chữ, không thành nút', () => {
    render(<Host />);
    fireEvent.paste(area(), { clipboardData: { getData: (k: string) => (k === 'text/plain' ? '<script>x</script><b>y</b>' : '<b>bad</b>') } });
    expect(latest.ed!.value.description).toBe('<script>x</script><b>y</b>');
    expect(area().querySelector('script, b')).toBeNull();
    expect(area().textContent).toContain('<script>x</script>');
  });

  it('5 nút: đậm / nghiêng / gạch chân trên vùng chọn, danh sách chấm / số; aria-pressed theo vùng chọn', () => {
    render(<Host plain={'Một\nHai'} />);
    selectAll();
    for (const k of ['bold', 'italic', 'underline']) fireEvent.click(document.querySelector(`[data-rt="${k}"]`)!);
    fireEvent.click(document.querySelector('[data-rt="olist"]')!);
    expect(document.querySelector('[data-rt="bold"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-rt="olist"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(area().querySelectorAll('strong em u, strong > em > u')).not.toHaveLength(0);
    const doc = latest.ed!.value.description_doc!;
    expect(descriptionDocSchema.safeParse(doc).success).toBe(true);
    expect(doc.content).toEqual([
      {
        type: 'ordered_list',
        content: [
          { type: 'list_item', content: [{ type: 'text', text: 'Một', marks: ['bold', 'italic', 'underline'] }] },
          { type: 'list_item', content: [{ type: 'text', text: 'Hai', marks: ['bold', 'italic', 'underline'] }] },
        ],
      },
    ]);
    expect(latest.ed!.value.description).toBe('Một\nHai');
    fireEvent.click(document.querySelector('[data-rt="list"]')!);
    expect(latest.ed!.value.description_doc!.content[0]!.type).toBe('bullet_list');
  });

  it('Ctrl+B bật đậm; Ctrl+Z hoàn tác, Ctrl+Y làm lại', () => {
    render(<Host plain="Serum" />);
    selectAll();
    fireEvent.keyDown(area(), { key: 'b', ctrlKey: true });
    expect(latest.ed!.active('bold')).toBe(true);
    fireEvent.keyDown(area(), { key: 'z', ctrlKey: true });
    expect(latest.ed!.value.description_doc!.content).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'Serum' }] }]);
    fireEvent.keyDown(area(), { key: 'y', ctrlKey: true });
    expect(latest.ed!.value.description_doc!.content[0]).toMatchObject({ content: [{ marks: ['bold'] }] });
  });

  it('IME: chuỗi đang ghép không vào mô hình; kết thúc ghép mới nhận chữ', () => {
    render(<Host />);
    fireEvent.compositionStart(area());
    expect(input('insertCompositionText', 'tie').defaultPrevented).toBe(false);
    expect(latest.ed!.value.description).toBe('');
    fireEvent.compositionEnd(area(), { data: 'tiếng' });
    expect(latest.ed!.value.description).toBe('tiếng');
  });

  it('xoá hết → giá trị rỗng gửi description_doc null (xoá định dạng ở server)', () => {
    render(<Host plain="x" />);
    selectAll();
    input('deleteContentBackward');
    expect(latest.ed!.value).toEqual({ description: '', description_doc: null });
  });
});

describe('ProductDescriptionView', () => {
  afterEach(() => cleanup());

  it('tài liệu → p / ul / ol / strong / em / u; chữ HTML hiển thị nguyên', () => {
    const doc: DescriptionDoc = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>', marks: ['bold'] }] },
        { type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'text', text: 'A', marks: ['italic'] }] }] },
        { type: 'ordered_list', content: [{ type: 'list_item', content: [{ type: 'text', text: 'B', marks: ['underline'] }] }] },
      ],
    };
    render(<ProductDescriptionView doc={doc} plain="ignored" />);
    const v = screen.getByTestId('pd-desc-view');
    expect(v.querySelector('img')).toBeNull();
    expect(v.querySelector('p strong')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(v.querySelector('ul li em')!.textContent).toBe('A');
    expect(v.querySelector('ol li u')!.textContent).toBe('B');
  });

  it('sản phẩm cũ: chữ thuần mỗi dòng một đoạn, không diễn giải Markdown', () => {
    render(<ProductDescriptionView plain={'**x**\ny'} />);
    const ps = screen.getByTestId('pd-desc-view').querySelectorAll('p');
    expect([...ps].map((p) => p.textContent)).toEqual(['**x**', 'y']);
    expect(screen.getByTestId('pd-desc-view').querySelector('strong')).toBeNull();
  });
});
