// Bước 2 của wizard với Email (REQ-B06 / B10, prototype L11254): Máy chủ IMAP · Cổng (993) · Email · Mật khẩu ứng dụng; SMTP tuỳ
// chọn (để trống → backend suy `smtp.` + 465). "Kiểm tra kết nối" gọi channel.test với đủ trường — đăng nhập thật (TIP-018).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelWizardStyles } from '../styles/channel-wizard.styles';

export interface EmailForm {
  address: string;
  imap_host: string;
  imap_port: string;
  password: string;
  smtp_host: string;
  smtp_port: string;
}

export const EMPTY_EMAIL_FORM: EmailForm = { address: '', imap_host: '', imap_port: '993', password: '', smtp_host: '', smtp_port: '' };

/** Trường gửi lên `channel.test` / `channel.email.connect` (bỏ ô trống — backend áp mặc định). */
export function emailFields(f: EmailForm): Record<string, string> {
  const out: Record<string, string> = { address: f.address.trim(), imap_host: f.imap_host.trim(), imap_port: f.imap_port.trim() || '993', password: f.password };
  if (f.smtp_host.trim()) out.smtp_host = f.smtp_host.trim();
  if (f.smtp_port.trim()) out.smtp_port = f.smtp_port.trim();
  return out;
}

/** Ô nhập: trường, khoá i18n nhãn, placeholder (`phKey` = khoá i18n, ngược lại số cổng), type input. */
interface Field {
  key: keyof EmailForm;
  label: string;
  ph: string;
  phKey?: boolean;
  type?: string;
}
const IMAP: Field[] = [{ key: 'imap_host', label: 'imapHost', ph: 'imapHostPh', phKey: true }, { key: 'imap_port', label: 'imapPort', ph: '993' }];
const LOGIN: Field[] = [{ key: 'address', label: 'address', ph: 'addressPh', phKey: true, type: 'email' }, { key: 'password', label: 'password', ph: 'passwordPh', phKey: true, type: 'password' }];
const SMTP: Field[] = [{ key: 'smtp_host', label: 'smtpHost', ph: 'smtpHostPh', phKey: true }, { key: 'smtp_port', label: 'smtpPort', ph: '465' }];

interface Props {
  form: EmailForm;
  onChange: (patch: Partial<EmailForm>) => void;
  onTest: () => void;
  testing: boolean;
  tested: boolean;
  error: string | null;
}

export function EmailConnectStep({ form, onChange, onTest, testing, tested, error }: Props) {
  const t = useTranslations('settings.channels.wizard');
  const s = useSectionStyles().styles;
  const { styles } = useChannelWizardStyles();
  const field = ({ key, label, ph, phKey, type }: Field) => (
    <div key={key}>
      <div className={s.label}>{t(label)}</div>
      <input className={s.input} value={form[key]} type={type ?? 'text'} onChange={(e) => onChange({ [key]: e.target.value })} placeholder={phKey ? t(ph) : ph} data-testid={`st-ch-wizard-${key}`} />
    </div>
  );
  return (
    <div className={styles.form}>
      <div className={styles.grid2}>{IMAP.map(field)}</div>
      {LOGIN.map(field)}
      <div className={styles.hint}>{t('smtpOptional')}</div>
      <div className={styles.grid2}>{SMTP.map(field)}</div>
      <div className={styles.testRow}>
        <button type="button" className={s.ghost} onClick={onTest} disabled={testing} data-testid="st-ch-wizard-test">
          {t('test')}
        </button>
        {tested ? (
          <span className={styles.testOk} data-testid="st-ch-wizard-tested">
            <Icon name="ic-check" size={14} color={color.brand} />
            {t('tested')}
          </span>
        ) : error ? (
          <span className={styles.hint} data-testid="st-ch-wizard-test-error">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
