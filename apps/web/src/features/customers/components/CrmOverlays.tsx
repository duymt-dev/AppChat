// Drawer / modal của màn Khách hàng theo crm-store + popup "AI gợi ý" (prototype L888–900).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAiStyles } from '../styles/ai.styles';
import { useCrmUi } from '../crm-store';
import { crmAiQuery } from '../api';
import { CollaboratorsModal } from './CollaboratorsModal';
import { ContactFormModal } from './ContactFormModal';
import { Customer360Drawer } from './Customer360Drawer';
import { DedupeModal } from './DedupeModal';
import { FieldsModal } from './FieldsModal';
import { TransferOwnerModal } from './TransferOwnerModal';
import { BulkTransferModal } from './BulkTransferModal';
import { ImportModal } from './ImportModal';
import { DeletedContactsDrawer } from './DeletedContactsDrawer';
import type { ContactRow } from '../types';
import { Opened, lazyDrawer } from '@/shared/dynamic/lazy-drawers';

const CrmAiDrawer = lazyDrawer(() => import('./CrmAiDrawer').then((m) => m.CrmAiDrawer));

function AiPeek() {
  const t = useTranslations('customers.peek');
  const { styles } = useAiStyles();
  const ui = useCrmUi();
  const items = useQuery(crmAiQuery()).data?.peek ?? [];
  const close = () => ui.set({ modal: null, target: null });
  return (
    <div className={styles.peekVeil} onClick={close} data-testid="crm-peek">
      <div className={styles.peek} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.peekHead}>
          <span className={styles.peekIcon}>
            <Icon name="ic-spark" size={16} color={color.white} strokeWidth={1.9} />
          </span>
          <div className={styles.grow}>
            <div className={styles.peekTitle}>{t('title')}</div>
            <div className={styles.peekSub}>{t('sub')}</div>
          </div>
        </div>
        <div className={styles.peekList}>
          {items.map((x) => (
            <div key={x} className={styles.peekItem}>
              <Icon name="ic-check" size={15} color={color.brand} strokeWidth={2} />
              <span>{x}</span>
            </div>
          ))}
        </div>
        <div className={styles.peekFoot}>
          <button type="button" className={styles.btn} onClick={close}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CrmOverlays({ rows, selected, onBulkDone }: { rows: ContactRow[]; selected: ContactRow[]; onBulkDone: () => void }) {
  const ui = useCrmUi();
  const target = rows.find((r) => r.id === ui.target);
  return (
    <>
      <Customer360Drawer />
      <Opened name="crm-ai" when={ui.modal === 'ai'} onClose={() => ui.set({ modal: null })}>
        <CrmAiDrawer />
      </Opened>
      <DeletedContactsDrawer />
      {ui.modal === 'create' ? <ContactFormModal mode="create" /> : null}
      {ui.modal === 'edit' && target ? <ContactFormModal key={target.id} mode="edit" contact={target} /> : null}
      {ui.modal === 'dedupe' ? <DedupeModal /> : null}
      {ui.modal === 'fields' ? <FieldsModal /> : null}
      {ui.modal === 'peek' ? <AiPeek /> : null}
      {ui.modal === 'collab' && ui.target ? <CollaboratorsModal contactId={ui.target} /> : null}
      {ui.modal === 'transfer' && target ? <TransferOwnerModal contact={target} /> : null}
      {ui.modal === 'bulkTransfer' && selected.length ? <BulkTransferModal contacts={selected} onDone={onBulkDone} /> : null}
      {ui.modal === 'import' ? <ImportModal /> : null}
    </>
  );
}
