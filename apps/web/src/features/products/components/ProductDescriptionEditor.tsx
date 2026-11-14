// Trình soạn mô tả sản phẩm (TIP-027b §2.4) — prototype L4134: thanh 5 nút (B / I / U / • / 1.) trên vùng soạn. Vùng soạn là contentEditable
// CHỈ để nhận vùng chọn + phím: mọi thay đổi (gõ, IME đã hoàn tất, dán chữ thuần, xoá, Enter, định dạng) đi qua mô hình có cấu trúc rồi React
// vẽ lại bằng nút chữ — không đọc innerHTML để lưu, không dangerouslySetInnerHTML. Nghe `beforeinput` GỐC (sự kiện React cùng tên là bản giả
// lập không có inputType / không bắt xoá). Dán / thả: chỉ text/plain (HTML / script thành chữ). Phím tắt Ctrl/Cmd + B / I / U / Z / Y.
// IME: để trình duyệt vẽ chuỗi đang ghép, nhận chữ cuối ở compositionend rồi dựng lại vùng soạn từ mô hình (bỏ nút DOM lạ trình duyệt chèn).
'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type CompositionEvent, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { DescriptionMark } from '@appchat/shared';
import { useDescriptionStyles } from '../styles/description.styles';
import { lineText, type Line, type Pos, type Sel } from '../hooks/description-selection';
import type { DescriptionEditorApi } from '../hooks/useProductDescription';
import { RunView } from './ProductDescriptionView';

const TOOLS = ['bold', 'italic', 'underline', 'list', 'olist'] as const;
type Tool = (typeof TOOLS)[number];
const STYLE: Partial<Record<Tool, 'rtBold' | 'rtItalic' | 'rtUnder' | 'rtSmall'>> = { bold: 'rtBold', italic: 'rtItalic', underline: 'rtUnder', olist: 'rtSmall' };
const KEYS: Record<string, DescriptionMark> = { b: 'bold', i: 'italic', u: 'underline' };
const FORMAT: Record<string, DescriptionMark> = { formatBold: 'bold', formatItalic: 'italic', formatUnderline: 'underline' };

/** Vị trí DOM (node, offset) → (dòng, offset trong chữ của dòng). Ký hiệu danh sách (•, 1.) không tính vào offset. */
export function posOf(root: HTMLElement, node: Node, offset: number): Pos | null {
  // Điểm nằm trên chính vùng soạn (offset = chỉ số dòng con) — chọn tất cả / con trỏ trước dòng đầu, sau dòng cuối.
  if (node === root) {
    const n = root.querySelectorAll('[data-line]').length;
    if (!n) return null;
    if (offset < n) return { line: offset, offset: 0 };
    return { line: n - 1, offset: (root.querySelector(`[data-line="${n - 1}"] [data-text]`)?.textContent ?? '').length };
  }
  const lineEl = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('[data-line]');
  const textEl = lineEl?.querySelector('[data-text]');
  if (!lineEl || !textEl || !root.contains(lineEl)) return null;
  const line = Number(lineEl.getAttribute('data-line'));
  const len = (textEl.textContent ?? '').length;
  if (node === lineEl) return { line, offset: offset <= [...lineEl.childNodes].indexOf(textEl as ChildNode) ? 0 : len };
  if (!textEl.contains(node)) return { line, offset: 0 };
  const r = document.createRange();
  r.selectNodeContents(textEl);
  r.setEnd(node, offset);
  return { line, offset: r.toString().length };
}

/** (dòng, offset) → điểm DOM để đặt lại vùng chọn sau khi React vẽ lại. */
function pointOf(root: HTMLElement, p: Pos): [Node, number] | null {
  const el = root.querySelector(`[data-line="${p.line}"] [data-text]`);
  if (!el) return null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let left = p.offset;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = n.textContent?.length ?? 0;
    if (left <= len) return [n, left];
    left -= len;
  }
  return [el, 0];
}

const nth = (lines: Line[], i: number) => {
  let n = 1;
  for (let j = i - 1; j >= 0 && lines[j]!.kind === 'ordered'; j--) n++;
  return n;
};

export function ProductDescriptionEditor({ ed }: { ed: DescriptionEditorApi }) {
  const t = useTranslations('products.form');
  const { styles, cx } = useDescriptionStyles();
  const root = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const api = useRef(ed);
  // Dựng lại phần chữ sau IME (key mới) — nút DOM trình duyệt tự chèn khi ghép chữ không còn sót lại.
  const [epoch, setEpoch] = useState(0);
  useLayoutEffect(() => {
    api.current = ed;
  });

  /** Đồng bộ vùng chọn DOM → mô hình trước mỗi thao tác (gõ nhanh sau phím mũi tên không dùng vùng chọn cũ). */
  const readSel = (range?: StaticRange | Range): Sel | null => {
    const el = root.current;
    const s = window.getSelection();
    const a = range ? ([range.startContainer, range.startOffset] as const) : s?.anchorNode ? ([s.anchorNode, s.anchorOffset] as const) : null;
    const f = range ? ([range.endContainer, range.endOffset] as const) : s?.focusNode ? ([s.focusNode, s.focusOffset] as const) : null;
    if (!el || !a || !f) return null;
    const anchor = posOf(el, a[0], a[1]);
    const focus = posOf(el, f[0], f[1]);
    if (!anchor || !focus) return null;
    const sel = { anchor, focus };
    api.current.setSel(sel);
    return sel;
  };
  const readRef = useRef(readSel);
  useLayoutEffect(() => {
    readRef.current = readSel;
  });

  // Sau mỗi lần vẽ lại theo mô hình: đặt lại vùng chọn DOM đúng vị trí mô hình (chỉ khi đang focus, không cướp focus).
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || document.activeElement !== el || composing.current) return;
    const a = pointOf(el, ed.sel.anchor);
    const f = pointOf(el, ed.sel.focus);
    const s = window.getSelection();
    if (a && f && s) s.setBaseAndExtent(a[0], a[1], f[0], f[1]);
  }, [ed.lines, ed.sel, epoch]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onBeforeInput = (ev: InputEvent) => {
      if (composing.current || ev.isComposing || ev.inputType === 'insertCompositionText') return;
      ev.preventDefault();
      const x = api.current;
      const type = ev.inputType;
      if (type === 'historyUndo') return x.undo();
      if (type === 'historyRedo') return x.redo();
      if (FORMAT[type]) {
        readRef.current();
        return x.mark(FORMAT[type]!);
      }
      if (type.startsWith('delete')) {
        const r = ev.getTargetRanges?.()[0];
        readRef.current(r && !r.collapsed ? r : undefined);
        return x.remove(type.endsWith('Forward') ? 'forward' : 'back');
      }
      readRef.current();
      if (type === 'insertParagraph' || type === 'insertLineBreak') return x.type('\n');
      const data = ev.data ?? ev.dataTransfer?.getData('text/plain') ?? '';
      if (type.startsWith('insert') && data) x.type(data);
    };
    el.addEventListener('beforeinput', onBeforeInput);
    return () => el.removeEventListener('beforeinput', onBeforeInput);
  }, []);

  const onCompositionEnd = (e: CompositionEvent<HTMLDivElement>) => {
    composing.current = false;
    if (e.data) ed.type(e.data);
    setEpoch((n) => n + 1);
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    readSel();
    if (text) ed.type(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (KEYS[k]) {
      e.preventDefault();
      readSel();
      ed.mark(KEYS[k]);
    } else if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      ed.undo();
    } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
      e.preventDefault();
      ed.redo();
    }
  };

  const press = (k: Tool) => {
    readSel();
    if (k === 'list') ed.list('bullet');
    else if (k === 'olist') ed.list('ordered');
    else ed.mark(k);
  };
  const on = (k: Tool) => (k === 'list' ? ed.kind === 'bullet' : k === 'olist' ? ed.kind === 'ordered' : ed.active(k));

  return (
    <div className={styles.rt}>
      <div className={styles.rtBar} role="toolbar" aria-label={t('rtBar')}>
        {TOOLS.map((k) => (
          <button
            key={k}
            type="button"
            className={cx(styles.rtBtn, STYLE[k] && styles[STYLE[k]!], on(k) && styles.rtOn)}
            title={t(`rt.${k}`)}
            aria-label={t(`rt.${k}`)}
            aria-pressed={on(k)}
            // Giữ vùng chọn của vùng soạn khi bấm nút (nút không lấy focus trước khi áp định dạng).
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => press(k)}
            data-rt={k}
          >
            {t(`rtl.${k}`)}
          </button>
        ))}
      </div>
      <div
        ref={root}
        className={styles.rtArea}
        contentEditable
        suppressContentEditableWarning
        tabIndex={0}
        role="textbox"
        aria-multiline="true"
        aria-label={t('desc')}
        spellCheck
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={onCompositionEnd}
        onPaste={onPaste}
        onDrop={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
        onSelect={() => readSel()}
        data-testid="pd-f-desc"
      >
        {ed.lines.map((l, i) => (
          <div key={`${epoch}:${i}`} data-line={i} data-kind={l.kind} className={cx(styles.rtLine, l.kind !== 'paragraph' && styles.rtItem)}>
            {l.kind !== 'paragraph' ? (
              <span className={styles.rtMarker} contentEditable={false} aria-hidden>
                {l.kind === 'bullet' ? '•' : `${nth(ed.lines, i)}.`}
              </span>
            ) : null}
            <span data-text>{lineText(l) ? <RunView runs={l.runs} /> : <br />}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
