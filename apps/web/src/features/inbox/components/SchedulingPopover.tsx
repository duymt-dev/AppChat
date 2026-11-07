// Popover "Đặt lịch hẹn" của ô soạn (TIP-025b §E): khung giờ TRỐNG THẬT (`/calendar/slots`) theo dịch vụ / ngày (giờ workspace) / nhân viên.
// Chọn giờ = đề xuất, KHÔNG phải đặt chỗ: mở form lịch hẹn chuẩn điền sẵn khách + hội thoại + dịch vụ / ngày / giờ / nhân viên — tạo lịch
// (kiểm lại giờ + EXCLUDE ở server) là bước riêng; hoặc chèn câu "đề xuất giờ" vào bản nháp (không phải xác nhận). Hội thoại chưa gắn
// khách → không tự tạo khách (form lịch hẹn yêu cầu chọn / tạo khách rõ ràng).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCalendarUi } from '@/features/calendar';
import { useComposerStyles } from '../styles/composer.styles';
import { usePopStyles } from '../styles/popover.styles';
import { useInboxSlots } from '../hooks/useInboxSlots';
import type { Conversation } from '../types';

export function SchedulingPopover({ conv, customer, onInsert, onClose }: { conv: Conversation; customer: string; onInsert: (text: string) => void; onClose: () => void }) {
  const t = useTranslations('inbox.composer.sched');
  const { styles, cx } = useComposerStyles();
  const { styles: ps } = usePopStyles();
  const s = useInboxSlots(true);
  const [sel, setSel] = useState(-1);
  const slot = s.slots[sel];
  const svc = s.services.find((x) => x.id === s.service);

  const book = () => {
    if (!slot) return;
    const staff = s.staffId || slot.staff_ids[0] || '';
    useCalendarUi.getState().set({
      form: 'create',
      prefill: {
        ...(conv.contact_id ? { contact_id: conv.contact_id } : {}),
        conversation_id: conv.id,
        contact_name: customer,
        service_id: s.service,
        date: s.date,
        start: slot.start,
        staff_id: staff,
      },
    });
    onClose();
  };

  return (
    <div className={cx(ps.pop, ps.popNarrow)} data-testid="sched-pop">
      <div className={ps.popHead}>
        <Icon name="ic-cal" size={16} color={color.calText} />
        {t('title', { name: customer })}
      </div>
      <div className={ps.popBody}>
        <select className={ps.field} value={s.service} aria-label={t('service')} onChange={(e) => (s.set({ service: e.target.value }), setSel(-1))} data-testid="sched-service">
          {s.services.map((x) => (
            <option key={x.id} value={x.id}>
              {t('serviceOpt', { name: x.name, min: x.duration })}
            </option>
          ))}
        </select>
        <input className={ps.field} type="date" value={s.date} min={s.meta?.today} aria-label={t('date')} onChange={(e) => (s.set({ date: e.target.value }), setSel(-1))} data-testid="sched-date" />
        <select className={ps.field} value={s.staffId} aria-label={t('staff')} onChange={(e) => (s.set({ staff: e.target.value }), setSel(-1))} data-testid="sched-staff">
          <option value="">{t('anyStaff')}</option>
          {s.staff.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <div className={ps.popHint}>{s.loading ? t('loading') : s.error ? t('error') : s.slots.length ? t('hint') : t('empty')}</div>
        {s.slots.slice(0, 8).map((x, i) => (
          <button key={`${x.start}-${i}`} type="button" className={cx(ps.slot, sel === i && ps.slotOn)} aria-pressed={sel === i} onClick={() => setSel(i)} data-testid="sched-slot">
            <span className={ps.qrTitle}>{`${x.start}–${x.end}`}</span>
            <span className={styles.grow}>
              <div className={ps.qrPreview}>{x.staff_ids.map(s.staffName).filter(Boolean).join(', ')}</div>
            </span>
          </button>
        ))}
        <button type="button" className={styles.primary} disabled={!slot} onClick={book} data-testid="sched-book">
          <Icon name="ic-cal" size={15} color={color.white} />
          {t('book')}
        </button>
        <button type="button" className={cx(ps.slot)} disabled={!slot || !svc} onClick={() => slot && svc && onInsert(t('propose', { service: svc.name, time: slot.start, date: s.date }))} data-testid="sched-propose">
          <span className={ps.qrTitle}>{t('proposeBtn')}</span>
        </button>
      </div>
    </div>
  );
}
