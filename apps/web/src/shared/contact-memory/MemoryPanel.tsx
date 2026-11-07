// Khối "AI ghi nhớ" + "AI tóm tắt theo phạm vi" của Hồ sơ 360° (TIP-015b mục 3, 6) — dùng chung drawer Khách hàng và panel Hộp thư.
// Fact mới nhất trước (≤ 50), nguồn (AI Agent / người / hệ thống); xoá một fact chỉ khi người xem sửa được khách (watcher chỉ xem).
// Tóm tắt: bấm mới gọi skill contact.summarize (không gọi model mỗi lần mở hồ sơ); `rule` ghi rõ là tổng hợp tự động, `retry` = dữ liệu
// vừa đổi khi đang tóm tắt.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '../i18n/useFmt';
import { useContactMemory } from './useContactMemory';
import { useMemoryStyles } from './memory.styles';

export function MemoryPanel({ contactId }: { contactId: string }) {
  const t = useTranslations('common.contactMemory');
  const fmt = useFmt();
  const { styles } = useMemoryStyles();
  const m = useContactMemory(contactId);
  const items = m.data?.items ?? [];
  const s = m.summary;
  return (
    <>
      <div className={styles.card} data-testid="p360-ai-summary">
        <div className={styles.head}>
          <span className={styles.eyebrow}>{t('summary')}</span>
          <button type="button" className={styles.link} onClick={() => void m.summarize(!!s)} disabled={m.summarizing} data-testid="p360-summarize">
            {m.summarizing ? t('summarizing') : s ? t('refresh') : t('summarize')}
          </button>
        </div>
        {s && s.status !== 'retry' && s.bullets.length ? (
          <>
            <ul className={styles.list}>
              {s.bullets.map((b) => (
                <li key={b} className={styles.item}>
                  <Icon name="ic-spark" size={13} color={color.violet} />
                  <span className={styles.fact}>{b}</span>
                </li>
              ))}
            </ul>
            <div className={styles.source}>{t(s.source === 'model' ? 'byModel' : 'byRule')}</div>
          </>
        ) : (
          <div className={styles.empty}>{s?.status === 'retry' ? t('retry') : t('summaryHint')}</div>
        )}
      </div>
      <div className={styles.card} data-testid="p360-memory">
        <div className={styles.head}>
          <span className={styles.eyebrow}>{t('title')}</span>
          {m.data ? <span className={styles.count}>{t('count', { n: items.length, cap: m.data.cap })}</span> : null}
        </div>
        {items.length ? (
          <ul className={styles.list}>
            {items.map((f) => (
              <li key={f.memory_id} className={styles.item} data-memory={f.memory_id}>
                <Icon name="ic-check" size={13} color={color.brand} />
                <span className={styles.fact}>
                  {f.fact}
                  <div className={styles.meta}>
                    {t(`source.${f.source}`)} · {fmt.date(f.updated_at)}
                  </div>
                </span>
                {m.data?.can_edit ? (
                  <button type="button" className={styles.forget} onClick={() => void m.forget(f.memory_id)} disabled={m.forgetting} title={t('forget')} aria-label={t('forget')} data-testid="p360-memory-forget">
                    <Icon name="ic-x" size={13} color="currentColor" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>{m.loading ? t('loading') : t('empty')}</div>
        )}
      </div>
    </>
  );
}
