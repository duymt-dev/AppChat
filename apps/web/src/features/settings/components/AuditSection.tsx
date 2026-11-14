// Mục Audit log + AI Audit log — prototype L7024–7044 (TIP-045b A2: dữ liệu thật, trang 50 theo con trỏ): tiêu đề + mô tả lưu trữ,
// "Xuất JSON" (các dòng đang tải), thanh lọc, bảng, "Xem thêm"; đủ trạng thái tải / rỗng / lỗi + thử lại (rỗng do lọc → gợi ý xoá lọc).
// Chỉ đọc (audit.view). Section chỉ điều phối — bảng ở components/audit, lọc ở hooks/useAuditFilters.
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAuditStyles } from '../styles/audit.styles';
import { useSectionStyles } from '../styles/section.styles';
import { aiAuditQuery, auditQuery } from '../api';
import { useAuditFilters } from '../hooks/useAuditFilters';
import { AuditFilters } from './audit/AuditFilters';
import { AuditTable } from './audit/AuditTable';
import { AiAuditTable } from './audit/AiAuditTable';

const JSON_TYPE = 'application/json';
/** Lựa chọn lọc hành động của Audit log: chỉ sự kiện bảo mật + vài loại hay tra. */
const AUDIT_ACTIONS = ['security', 'member.set_role', 'member.invite', 'member.remove', 'channel.disconnect', 'contact.export', 'workspace.transfer_ownership'];

const download = (name: string, rows: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: JSON_TYPE }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

function Head({ kind, rows }: { kind: 'audit' | 'ai'; rows: unknown[] }) {
  const t = useTranslations('settings.audit');
  const { styles } = useAuditStyles();
  return (
    <div className={styles.head}>
      <div className={styles.t}>{t(`${kind}.title`)}</div>
      <span className={styles.s}>{t(`${kind}.sub`)}</span>
      <span className={styles.grow} />
      <button type="button" className={styles.exp} onClick={() => download(t(`${kind}.file`), rows)} data-testid="st-audit-export">
        <Icon name="ic-download" size={13} color={color.text3} />
        {t('export')}
      </button>
    </div>
  );
}

function More({ q }: { q: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown } }) {
  const t = useTranslations('settings.audit');
  const s = useSectionStyles().styles;
  if (!q.hasNextPage) return null;
  return (
    <div className={s.foot}>
      <button type="button" className={s.link} disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()} data-testid="st-audit-more">
        {q.isFetchingNextPage ? t('loading') : t('more')}
      </button>
    </div>
  );
}

function Empty({ active, reset }: { active: boolean; reset: () => void }) {
  const t = useTranslations('settings.audit');
  const s = useSectionStyles().styles;
  return (
    <div className={s.card} data-testid="st-audit-empty">
      <div className={s.muted}>{active ? t('emptyFiltered') : t('empty')}</div>
      {active ? (
        <button type="button" className={s.link} onClick={reset}>
          {t('filter.reset')}
        </button>
      ) : null}
    </div>
  );
}

export function AuditSection() {
  const f = useAuditFilters();
  const q = useInfiniteQuery(auditQuery(f.filter));
  const rows = q.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <>
      <Head kind="audit" rows={rows} />
      <AuditFilters {...f} actions={AUDIT_ACTIONS} />
      <PageStates state={stateOf(q, () => rows.length === 0)} onRetry={() => void q.refetch()} empty={<Empty active={f.active} reset={f.reset} />}>
        <AuditTable rows={rows} />
        <More q={q} />
      </PageStates>
    </>
  );
}

export function AiAuditSection() {
  const f = useAuditFilters();
  const q = useInfiniteQuery(aiAuditQuery(f.filter));
  const rows = q.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <>
      <Head kind="ai" rows={rows} />
      <AuditFilters {...f} />
      <PageStates state={stateOf(q, () => rows.length === 0)} onRetry={() => void q.refetch()} empty={<Empty active={f.active} reset={f.reset} />}>
        <AiAuditTable rows={rows} />
        <More q={q} />
      </PageStates>
    </>
  );
}
