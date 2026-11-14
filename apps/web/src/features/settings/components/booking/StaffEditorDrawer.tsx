// Thêm / sửa nhân sự nhận lịch (TIP-033b §3): tên, vai trò + ca riêng ba trạng thái. Sửa gửi if_version của bản đang mở (409
// STALE_VERSION: useAction báo, drawer giữ nháp). Ngừng nhân sự: server chặn khi còn lịch đang làm / giữ chỗ tương lai.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { dayErrors, type DayInput } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../../styles/section.styles';
import { useBookingStyles } from '../../styles/booking.styles';
import type { BookingStaff } from '../../hooks/useBookingSettings';
import { StaffScheduleEditor } from './StaffScheduleEditor';

export function StaffEditorDrawer({ staff, onClose }: { staff: BookingStaff | null; onClose: () => void }) {
  const t = useTranslations('settings.booking');
  const s = useSectionStyles().styles;
  const { styles } = useBookingStyles();
  const create = useAction('staff.create');
  const update = useAction('staff.update');
  const deactivate = useAction('staff.deactivate');
  const [name, setName] = useState(staff?.name ?? '');
  const [role, setRole] = useState(staff?.role ?? '');
  const [schedule, setSchedule] = useState<DayInput[]>(staff?.schedule ?? []);
  const errors = dayErrors(schedule, 'schedule');
  const valid = name.trim().length > 0 && !Object.keys(errors).length;
  const busy = create.isPending || update.isPending || deactivate.isPending;
  const version = staff?.version ? { if_version: staff.version } : {};
  const save = async () => {
    const fields = { name: name.trim(), role: role.trim(), schedule };
    const r = staff ? await update.run({ staff_id: staff.id, patch: fields, ...version }) : await create.run(fields);
    if (r) onClose();
  };
  const stop = async () => {
    if (!staff) return;
    if (await deactivate.run({ staff_id: staff.id, ...version })) onClose();
  };
  return (
    <EntityDrawer
      open
      onClose={onClose}
      title={staff ? staff.name : t('addStaff')}
      icon="ic-users"
      closeLabel={t('close')}
      width={460}
      testId="st-bk-staff-drawer"
      footer={
        <div className={styles.foot}>
          {staff?.active ? (
            <button type="button" className={s.dangerGhost} disabled={busy} onClick={() => void stop()} data-testid="st-bk-deactivate">
              {t('deactivate')}
            </button>
          ) : null}
          <button type="button" className={s.primary} disabled={!valid || busy} onClick={() => void save()} data-testid="st-bk-staff-save">
            {t('save')}
          </button>
        </div>
      }
    >
      <div className={styles.stack}>
        <div>
          <div className={s.label}>{t('name')}</div>
          <input className={s.input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid="st-bk-name" />
        </div>
        <div>
          <div className={s.label}>{t('role')}</div>
          <input className={s.input} value={role} maxLength={60} onChange={(e) => setRole(e.target.value)} data-testid="st-bk-role" />
        </div>
        <div className={styles.title}>{t('ownSchedule')}</div>
        <StaffScheduleEditor value={schedule} onChange={setSchedule} errors={errors} />
      </div>
    </EntityDrawer>
  );
}
