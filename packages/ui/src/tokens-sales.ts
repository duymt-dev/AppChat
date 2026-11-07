// Màu chứng từ bán hàng (Báo giá / Hợp đồng / Đơn / Đề nghị thanh toán — prototype L4957–5624); trải vào `color` ở tokens.ts.
export const salesColor = {
  pendingText: '#8A5A0C',
  sentBg: '#EAF1FD',
  rejectText: '#B42318',
  assigneeBg: '#EAF1FC',
  codeMuted: '#A9B2BC',
  aiResultLine: '#E3D9FB',
  commentAvatar: '#EEF1F4',
  variantDash: '#D9DEE4',
  laneBg: '#F4F6F8',
  ringTrack: '#F0F2F1',
  okGreen: '#16A34A',
  amberDeep: '#D97706',
} as const;

export const salesGradient = {
  quoteAi: 'linear-gradient(135deg,#F6F2FF,#ECFDF5)',
  quoteAiIcon: 'linear-gradient(135deg,#6E48E6,#2DC56A)',
} as const;
