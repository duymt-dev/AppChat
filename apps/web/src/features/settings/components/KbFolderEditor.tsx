// Drawer "Sửa thư mục" của Dữ liệu RAG (TIP-020b — prototype không có, PD ghi ở docs/06-prototype/DEVIATIONS.md): tên, thư mục cha, mặc
// định "Ai được dùng" cho nguồn MỚI (nguồn đã có giữ nguyên), Xoá (chỉ khi rỗng — server trả HAS_DEPENDENCIES kèm số nguồn / thư mục con).
// Ghi: kb.folder.update / kb.folder.delete với `if_version` (người khác vừa sửa → STALE_VERSION, toast lỗi của useAction).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useRagModalStyles } from '../styles/rag-modal.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import { useSettingsUi } from '../settings-store';
import type { KbFolder } from '../types';

const VIS = ['public', 'internal'] as const;
const TOP = '';

/** Thư mục được chọn làm cha: không phải chính nó và không phải con cháu của nó (server cũng chặn vòng). */
function parentOptions(all: KbFolder[], self: string): KbFolder[] {
  const banned = new Set([self]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of all) {
      if (f.parent_id && banned.has(f.parent_id) && !banned.has(f.id)) {
        banned.add(f.id);
        grew = true;
      }
    }
  }
  return all.filter((f) => !banned.has(f.id));
}

function Form({ f, all }: { f: KbFolder; all: KbFolder[] }) {
  const t = useTranslations('settings.rag.folderEdit');
  const s = useSectionStyles().styles;
  const { styles, cx } = useRagModalStyles();
  const cm = useChannelManageStyles().styles;
  const set = useSettingsUi((u) => u.set);
  const [name, setName] = useState(f.name);
  const [parent, setParent] = useState(f.parent_id ?? TOP);
  const [vis, setVis] = useState(f.visibility ?? 'public');
  const update = useAction('kb.folder.update');
  const remove = useAction('kb.folder.delete');
  const close = () => set({ kbFolderEdit: null });
  const ver = f.version !== undefined ? { if_version: f.version } : {};
  const save = async () => {
    const patch = {
      ...(name.trim() !== f.name ? { name: name.trim() } : {}),
      ...(vis !== (f.visibility ?? 'public') ? { visibility: vis } : {}),
      ...(parent !== (f.parent_id ?? TOP) ? { parent_id: parent || null } : {}),
    };
    if (!Object.keys(patch).length) return close();
    if (await update.run({ folder_id: f.id, ...patch, ...ver })) close();
  };
  const del = async () => {
    if (await remove.run({ folder_id: f.id, ...ver })) set({ kbFolderEdit: null, kbFolder: null });
  };
  return (
    <EntityDrawer
      open
      onClose={close}
      title={t('title')}
      icon="ic-folder"
      closeLabel={t('close')}
      width={460}
      testId="st-rag-folder-drawer"
      footer={
        <div className={cm.foot}>
          <button type="button" className={s.dangerGhost} onClick={() => void del()} disabled={remove.isPending} data-testid="st-rag-folder-del">
            {t('del')}
          </button>
          <span className={cm.grow} />
          <button type="button" className={s.ghost} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={s.primary} onClick={() => void save()} disabled={update.isPending || !name.trim()} data-testid="st-rag-folder-save">
            {t('save')}
          </button>
        </div>
      }
    >
      <div className={cm.stack}>
        <label>
          <div className={s.label}>{t('name')}</div>
          <input className={s.input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus data-testid="st-rag-folder-edit-name" />
        </label>
        <label>
          <div className={s.label}>{t('parent')}</div>
          <select className={s.select} value={parent} onChange={(e) => setParent(e.target.value)} data-testid="st-rag-folder-parent">
            <option value={TOP}>{t('top')}</option>
            {parentOptions(all, f.id).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <div className={s.label}>{t('visibility')}</div>
          <div className={styles.seg} role="radiogroup" aria-label={t('visibility')} data-testid="st-rag-folder-vis">
            {VIS.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={vis === v} className={cx(styles.segBtn, vis === v && styles.segOn)} onClick={() => setVis(v)} data-testid={`st-rag-folder-vis-${v}`}>
                {t(v)}
              </button>
            ))}
          </div>
          <div className={cx(s.muted, styles.visHint)}>{t('visD')}</div>
        </div>
      </div>
    </EntityDrawer>
  );
}

export function KbFolderEditor({ folders }: { folders: KbFolder[] }) {
  const id = useSettingsUi((u) => u.kbFolderEdit);
  const f = id ? folders.find((x) => x.id === id) : undefined;
  // `key` theo id + version: mở lại sau khi lưu nạp giá trị mới.
  return f ? <Form key={`${f.id}:${f.version ?? 0}`} f={f} all={folders} /> : null;
}
