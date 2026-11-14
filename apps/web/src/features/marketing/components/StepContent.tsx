// Bước 3 wizard — Nội dung (prototype L3740–3765): tên · tiêu đề (email) · AI viết lại theo giọng (campaign.draft_content — model thật qua
// gateway, tốn AI Credit, chỉ trả đề xuất; nội dung chỉ đổi khi server trả về) · trình soạn · biến cá nhân hoá hợp lệ {ten} {ma_khach} {hang}.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useWizardStyles } from '../styles/wizard.styles';
import { useComposeStyles } from '../styles/compose.styles';
import type { WizardDraft } from '../hooks/useWizard';

type Tone = 'friendly' | 'formal' | 'short' | 'promo';
const TONES: [Tone, string][] = [
  ['friendly', color.successStrong],
  ['formal', color.violet],
  ['promo', color.dangerStrong],
];
const TOOLS: [string, string, string][] = [
  ['B', 'bold', '**'],
  ['I', 'italic', '_'],
  ['U', 'underline', '__'],
  ['•', 'ul', '\n• '],
  ['1.', 'ol', '\n1. '],
];

export function StepContent({ d, patch }: { d: WizardDraft; patch: (p: Partial<WizardDraft>) => void }) {
  const t = useTranslations('marketing.wiz');
  const { message } = App.useApp();
  const w = useWizardStyles().styles;
  const { styles } = useComposeStyles();
  // Chuỗi chứa {ten}… nguyên văn (không phải tham số ICU) — đọc raw.
  const s3sub = t.raw('s3sub') as string;
  const draft = useAction<{ text: string; run_id: string }>('campaign.draft_content');
  const rewrite = async (tone: Tone) => {
    if (!d.body.trim()) return void message.error(t('errBody'));
    const r = await draft.run({ text: d.body.trim(), tone, channel: d.channel }, { silent: true });
    if (!r) return;
    patch({ body: r.result.text });
    void message.success(t('toneDone', { l: t(`tones.${tone}`) }));
  };
  return (
    <>
      <div className={w.sec}>
        <div className={w.secT}>{t('s3')}</div>
        <div className={w.secS}>{s3sub}</div>
      </div>
      <div className={w.field}>
        <div className={w.label}>{t('name')}</div>
        <input className={w.input} value={d.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t('namePh')} data-testid="mk-wiz-name" />
      </div>
      {d.channel === 'email' ? (
        <div className={w.field}>
          <div className={w.label}>{t('subject')}</div>
          <input className={w.input} value={d.subject} onChange={(e) => patch({ subject: e.target.value })} data-testid="mk-wiz-subject" />
        </div>
      ) : null}
      <div className={styles.aiCard}>
        <div className={styles.aiH}>
          <span className={styles.aiIc}>
            <Icon name="ic-spark" size={14} color={color.white} strokeWidth={1.9} />
          </span>
          {t('aiCompose')}
          <span className={styles.aiS}>{t('aiComposeSub')}</span>
        </div>
        <div className={styles.tones}>
          {TONES.map(([k, c]) => (
            <button key={k} type="button" className={styles.tone} disabled={draft.isPending} style={{ borderColor: `${c}44`, color: c }} onClick={() => void rewrite(k)} data-testid={`mk-tone-${k}`}>
              <Icon name="ic-spark" size={13} color={c} strokeWidth={1.9} />
              {t(`tones.${k}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={w.label}>{t('body')}</div>
      <div className={styles.editor}>
        <div className={styles.bar}>
          {TOOLS.map(([l, k, mark]) => (
            <button key={k} type="button" className={styles.tool} title={t(`tools.${k}`)} aria-label={t(`tools.${k}`)} onClick={() => patch({ body: d.body + mark })}>
              {l}
            </button>
          ))}
          <span className={w.grow} />
          <button type="button" className={styles.help} disabled={draft.isPending} onClick={() => void rewrite('short')} data-testid="mk-tone-short">
            <Icon name="ic-spark" size={12} color={color.violetInk} />
            {t('aiHelp')}
          </button>
        </div>
        <textarea className={styles.text} value={d.body} onChange={(e) => patch({ body: e.target.value })} aria-label={t('body')} data-testid="mk-wiz-body" />
      </div>
      <div className={styles.preview}>
        <Icon name="ic-spark" size={16} color={color.info} />
        <span>{t.rich('preview', { b: (c) => <b>{c}</b> })}</span>
      </div>
    </>
  );
}
