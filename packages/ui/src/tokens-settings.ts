// Màu / gradient mục Cài đặt (prototype L5754–7421); trải vào `color` / `gradient` ở tokens.ts.
export const settingsColor = {
  switchShadow: 'rgba(0,0,0,.2)',
  codeBg: '#0F172A',
  codeText: '#CBD5E1',
  wgPanel: '#F4F6F8',
  wgAiLine: '#D7EEE0',
  wgBlueBg: '#E7F0FF',
  wgChatBg: '#F7F9FB',
  wgFoot: '#EEF1F4',
  wgWhite85: 'rgba(255,255,255,.85)',
  wgShadowMsg: 'rgba(15,23,42,.06)',
  wgOnline: '#7BFFB0',
  wgPowered: '#B5BDC6',
  wgWhite20: 'rgba(255,255,255,.2)',
  fieldsHeroText: '#5B6B62',
  fieldsOff: '#C0C4C9',
  govWarnText: '#8A5A10',
  govRiskText: '#B42318',
  govBorder: '#FCD34D',
  govIcon: '#D97706',
  aiTierBadge: '#E7F7EE',
  auditHead: '#FAFBFB',
  ragDrop: '#C9D4CD',
} as const;

export const settingsGradient = {
  wgAiBox: 'linear-gradient(135deg,#EDFAF3,#F2EEFD)',
  wgPreview: 'linear-gradient(160deg,#EAF6FF,#F4F7FA)',
  wgHead: 'linear-gradient(135deg,#2DC56A,#1FB85C)',
  fieldsHero: 'linear-gradient(135deg,#EDFAF3,rgba(255,255,255,0))',
  govHero: 'linear-gradient(135deg,#FEF3C7,#fff)',
} as const;

export const settingsShadow = {
  wgPanel: '0 20px 48px rgba(15,23,42,.22)',
  wgLauncher: '0 8px 22px rgba(45,197,106,.45)',
  wgMsg: '0 1px 2px rgba(15,23,42,.06)',
  wgAvatar: '0 2px 6px rgba(0,0,0,.15)',
} as const;
