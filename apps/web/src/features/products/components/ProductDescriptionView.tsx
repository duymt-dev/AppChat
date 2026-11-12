// Hiển thị mô tả sản phẩm an toàn (TIP-027b §2.5): tài liệu có cấu trúc → thẻ ngữ nghĩa (p / ul / ol / strong / em / u) bằng nút chữ React —
// không dangerouslySetInnerHTML, chữ `<b>` / `**x**` là chữ. Sản phẩm cũ (chưa có tài liệu) → mỗi dòng một đoạn từ chữ thuần, không diễn
// giải lại thành định dạng.
'use client';
import { Fragment, type ReactNode } from 'react';
import type { DescriptionDoc, DescriptionText } from '@appchat/shared';
import { useDescriptionStyles } from '../styles/description.styles';
import type { Run } from '../hooks/description-selection';

function wrap(text: string, marks: readonly string[]): ReactNode {
  let n: ReactNode = text;
  if (marks.includes('underline')) n = <u>{n}</u>;
  if (marks.includes('italic')) n = <em>{n}</em>;
  if (marks.includes('bold')) n = <strong>{n}</strong>;
  return n;
}

/** Một dãy chữ có dấu (dùng chung cho trình soạn và phần xem). */
export function RunView({ runs }: { runs: readonly Run[] | readonly DescriptionText[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Fragment key={i}>{wrap(r.text, r.marks ?? [])}</Fragment>
      ))}
    </>
  );
}

export function ProductDescriptionView({ doc, plain, className }: { doc?: DescriptionDoc | null; plain: string; className?: string }) {
  const { styles, cx } = useDescriptionStyles();
  if (!doc) {
    if (!plain) return null;
    return (
      <div className={cx(styles.view, className)} data-testid="pd-desc-view">
        {plain.split('\n').map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    );
  }
  return (
    <div className={cx(styles.view, className)} data-testid="pd-desc-view">
      {doc.content.map((b, i) =>
        b.type === 'paragraph' ? (
          <p key={i}>
            <RunView runs={b.content ?? []} />
          </p>
        ) : b.type === 'bullet_list' ? (
          <ul key={i}>
            {b.content.map((it, j) => (
              <li key={j}>
                <RunView runs={it.content ?? []} />
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i}>
            {b.content.map((it, j) => (
              <li key={j}>
                <RunView runs={it.content ?? []} />
              </li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
