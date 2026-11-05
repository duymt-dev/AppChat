// Mục Dữ liệu RAG · Knowledge Base — prototype L6906–6948 (D29): ô tìm tệp (theo tên / thẻ), "Thư mục mới", "Upload"; cột trái 240:
// nav (tất cả · AI đã học · từ hội thoại · do bạn upload · gắn sao · thùng rác + số), thư mục, thẻ "AI Knowledge" + "Train lại";
// bảng tệp (badge loại, thẻ, "Đã học", size, nguồn, người tạo, ngày, ⋯ Học lại / Xoá). Ghi: kb.add_source / remove_source /
// refresh_source / folder.create. Thùng rác giữ 30 ngày (undo của kb.remove_source). TIP-020b: nút tải thật (useKbDownload), nguồn catalog
// không xoá (khoá + giải thích — server cũng chặn), sửa / xoá thư mục ở KbFolderEditor. TIP-043: mục "Chờ duyệt" (người có kb.manage) →
// KbSuggestionsPanel (hàng chờ học từ hội thoại).
'use client';
import { useEffect } from 'react';
import { App } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useRagStyles } from '../styles/rag.styles';
import { useRagFolderStyles } from '../styles/rag-folder.styles';
import { useRagModalStyles } from '../styles/rag-modal.styles';
import { useSettingsUi } from '../settings-store';
import { kbQuery } from '../api';
import type { KbData, KbDoc } from '../types';
import { RowMenu } from './RowMenu';
import { RagUploadModal } from './RagUploadModal';
import { KbFolderEditor } from './KbFolderEditor';
import { useKbDownload } from '../hooks/useKbDownload';
import { useKbPendingCount } from '../hooks/useKbSuggestions';
import { KbSuggestionsPanel } from './KbSuggestionsPanel';

const NAV: [string, IconName][] = [
  ['all', 'ic-doc'],
  ['learned', 'ic-spark'],
  ['conv', 'ic-inbox'],
  ['upload', 'ic-download'],
  ['star', 'ic-star'],
  ['trash', 'ic-trash'],
];
const SEP = ' · ';
const REVIEW = 'review';
const PRODUCTS = '/products';

function DocRow({ d, kb, can }: { d: KbDoc; kb: KbData; can: boolean }) {
  const t = useTranslations('settings.rag');
  const fmt = useFmt();
  const { styles } = useRagStyles();
  const remove = useAction('kb.remove_source');
  const refresh = useAction('kb.refresh_source');
  const dl = useKbDownload();
  const router = useRouter();
  const catalog = d.origin === 'catalog';
  const [badge, fg, bg] = kb.types[d.type] ?? kb.types.pdf ?? ['', color.text3, color.divider];
  return (
    <div className={styles.row} data-doc={d.id}>
      <div className={styles.nameCell}>
        <span className={styles.badge} style={{ background: bg, color: fg }}>
          {d.type === 'folder' ? <Icon name="ic-folder" size={18} color={fg} strokeWidth={1.7} /> : badge}
        </span>
        <div className={styles.min}>
          <div className={styles.name}>{d.name}</div>
          <div className={styles.tags}>
            {d.tags.map((x) => (
              <span key={x} className={styles.tag}>
                {x}
              </span>
            ))}
            {d.learned ? (
              <span className={styles.learned}>
                <Icon name="ic-spark" size={10} color={color.brand} strokeWidth={2} />
                {t('learned')}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <span className={styles.size}>{d.size}</span>
      <span className={styles.muted}>{t(`src.${d.source}`)}</span>
      <span className={styles.size}>{d.by}</span>
      <span className={styles.muted}>{fmt.date(d.date)}</span>
      <div className={styles.acts}>
        <button type="button" className={styles.dl} aria-label={t('download')} title={t('download')} disabled={dl.busy === d.id} onClick={() => void dl.download(d.id, d.name)} data-testid="st-rag-dl">
          <Icon name="ic-dl" size={15} color="currentColor" />
        </button>
        {can ? (
          <RowMenu
            id={`kb:${d.id}`}
            items={[
              { key: 'learn', label: t('relearn'), icon: 'ic-refresh', onClick: () => void refresh.run({ source_id: d.id }) },
              // Nguồn đồng bộ từ sản phẩm: sửa / xoá ở màn Sản phẩm (server trả CONFLICT catalog_managed).
              ...(catalog
                ? [{ key: 'catalog', label: t('catalogLocked'), icon: 'ic-box' as IconName, onClick: () => router.push(PRODUCTS) }]
                : [{ key: 'del', label: t('del'), icon: 'ic-trash' as IconName, danger: true, onClick: () => void remove.run({ source_id: d.id }) }]),
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}

export function RagSection() {
  const t = useTranslations('settings.rag');
  const { modal } = App.useApp();
  const { styles, cx } = useRagStyles();
  const m = useRagModalStyles().styles;
  const rf = useRagFolderStyles().styles;
  const ui = useSettingsUi();
  const can = useCan('kb.manage');
  const q = useQuery(kbQuery({ nav: ui.kbNav, folder: ui.kbFolder, q: ui.kbQ }));
  const refresh = useAction('kb.refresh_source');
  const folder = useAction('kb.folder.create');
  const kb = q.data;
  const pending = useKbPendingCount();
  const sp = useSearchParams();
  const setUi = ui.set;
  // Link thông báo `ai_review` (kb) → /settings/rag_data?nav=review mở thẳng hàng chờ.
  useEffect(() => {
    if (sp.get('nav') === REVIEW) setUi({ kbNav: REVIEW, kbFolder: null });
  }, [sp, setUi]);
  const folderName = kb?.folders.find((f) => f.id === ui.kbFolder)?.name;
  const newFolder = () => {
    let name = '';
    modal.confirm({
      title: t('newFolder'),
      icon: null,
      content: <input className={m.prompt} autoFocus placeholder={t('folderPh')} onChange={(e) => (name = e.target.value)} data-testid="st-rag-folder-name" />,
      okText: t('create'),
      cancelText: t('cancel'),
      onOk: async () => {
        if (!name.trim()) throw new Error(t('folderPh'));
        await folder.run({ name: name.trim() });
      },
    });
  };
  return (
    <>
      <div className={styles.bar}>
        <label className={styles.search}>
          <Icon name="ic-spark" size={14} color={color.text4} strokeWidth={1.9} />
          <input value={ui.kbQ} onChange={(e) => ui.set({ kbQ: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="st-rag-search" />
        </label>
        <span className={styles.grow} />
        {can ? (
          <>
            <button type="button" className={styles.ghost} onClick={newFolder} data-testid="st-rag-folder">
              <Icon name="ic-folder" size={14} color={color.text3} />
              {t('newFolder')}
            </button>
            <button type="button" className={styles.primary} onClick={() => ui.set({ kbUpload: true })} data-testid="st-rag-upload">
              <Icon name="ic-dl" size={14} color={color.white} strokeWidth={2} />
              {t('upload')}
            </button>
          </>
        ) : null}
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {kb ? (
          <div className={styles.grid}>
            <div className={styles.side}>
              <div className={styles.navBox}>
                {NAV.map(([k, ic]) => {
                  const on = ui.kbNav === k && !ui.kbFolder;
                  return (
                    <button key={k} type="button" className={cx(styles.nav, on && styles.navOn)} onClick={() => ui.set({ kbNav: k, kbFolder: null })} data-testid={`st-rag-nav-${k}`}>
                      <Icon name={ic} size={16} color={on ? color.brand : color.text4} />
                      <span className={styles.grow}>{t(`nav.${k}`)}</span>
                      <span className={styles.navN}>{kb.nav[k]}</span>
                    </button>
                  );
                })}
                {can ? (
                  <button type="button" className={cx(styles.nav, ui.kbNav === REVIEW && !ui.kbFolder && styles.navOn)} onClick={() => ui.set({ kbNav: REVIEW, kbFolder: null })} data-testid="st-rag-nav-review">
                    <Icon name="ic-check" size={16} color={ui.kbNav === REVIEW ? color.brand : color.text4} />
                    <span className={styles.grow}>{t('nav.review')}</span>
                    <span className={styles.navN}>{pending}</span>
                  </button>
                ) : null}
                <div className={styles.sep} />
                <div className={styles.fHead}>{t('folders')}</div>
                {kb.folders.map((f) => (
                  <div key={f.id} className={rf.folderRow} data-folder={f.id}>
                    <button type="button" className={cx(styles.folder, ui.kbFolder === f.id && styles.folderOn)} onClick={() => ui.set({ kbNav: 'all', kbFolder: f.id })}>
                      <Icon name={f.visibility === 'internal' ? 'ic-shield' : 'ic-folder'} size={15} color={color.text4} strokeWidth={1.7} />
                      <span>{f.name}</span>
                    </button>
                    {can ? (
                      <button type="button" className={rf.folderEdit} aria-label={t('folderEdit.open', { n: f.name })} onClick={() => ui.set({ kbFolderEdit: f.id })} data-testid="st-rag-folder-edit">
                        <Icon name="ic-edit" size={13} color="currentColor" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className={styles.know}>
                <div className={styles.knowHead}>
                  <span className={styles.knowIc}>
                    <Icon name="ic-spark" size={14} color={color.white} />
                  </span>
                  <span className={styles.knowT}>{t('knowT')}</span>
                </div>
                <div className={styles.knowS}>{t.rich('knowS', { n: kb.learned_total, b: (c) => <b>{c}</b> })}</div>
                {can ? (
                  <button type="button" className={styles.train} onClick={() => void refresh.run({ source_id: 'all' })} data-testid="st-rag-train">
                    <Icon name="ic-refresh" size={13} color={color.white} strokeWidth={1.9} />
                    {t('train')}
                  </button>
                ) : null}
              </div>
            </div>
            {ui.kbNav === REVIEW && can ? (
              <KbSuggestionsPanel folders={kb.folders} />
            ) : (
            <div className={styles.table} data-testid="st-rag">
              <div className={styles.tHead}>
                <div className={styles.tT}>{folderName ?? t(`nav.${ui.kbNav}`)}</div>
                <span className={styles.tS}>
                  {SEP}
                  {t('files', { n: kb.data.length, s: kb.size })}
                </span>
              </div>
              <div className={styles.th}>
                <span>{t('col.name')}</span>
                <span>{t('col.size')}</span>
                <span>{t('col.src')}</span>
                <span>{t('col.by')}</span>
                <span>{t('col.date')}</span>
                <span />
              </div>
              {kb.data.map((d) => (
                <DocRow key={d.id} d={d} kb={kb} can={can} />
              ))}
              {kb.data.length === 0 ? <div className={styles.empty}>{t(ui.kbNav === 'trash' ? 'trashEmpty' : 'empty')}</div> : null}
            </div>
            )}
          </div>
        ) : null}
      </PageStates>
      {ui.kbUpload && kb ? <RagUploadModal folders={kb.folders} folderId={ui.kbFolder} /> : null}
      {kb ? <KbFolderEditor folders={kb.folders} /> : null}
    </>
  );
}
