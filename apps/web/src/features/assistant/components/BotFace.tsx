// Mặt bot AppChat — SVG nguyên bản prototype (L1196 màn chào, L1265 avatar hội thoại, L1288 "đang soạn").
// Màu lấy từ nhóm token `illus` (hình minh hoạ).
'use client';
import { useId } from 'react';
import { illus as c } from '@appchat/ui';

export function BotFaceLarge({ className }: { className?: string }) {
  const id = `bot${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor={c.botLight} />
          <stop offset="55%" stopColor={c.botMid} />
          <stop offset="100%" stopColor={c.botDeep} />
        </radialGradient>
      </defs>
      <line x1="50" y1="9" x2="50" y2="20" stroke={c.botDeep} strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="7" r="4" fill={c.botMid} />
      <rect x="14" y="18" width="72" height="64" rx="30" fill={`url(#${id})`} />
      <circle cx="30" cy="58" r="6" fill={c.botCheek} opacity=".55" />
      <circle cx="70" cy="58" r="6" fill={c.botCheek} opacity=".55" />
      <rect x="31" y="44.5" width="11" height="11" rx="5.5" fill={c.botEye} />
      <rect x="58" y="44.5" width="11" height="11" rx="5.5" fill={c.botEye} />
      <circle cx="35" cy="47" r="2" fill={c.white} opacity=".9" />
      <circle cx="62" cy="47" r="2" fill={c.white} opacity=".9" />
      <path d="M42 65 Q50 72 58 65" stroke={c.botEye} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function BotFaceSmall({ talking }: { talking?: boolean }) {
  const id = `bot${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" width={34} height={34} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor={c.botTealLight} />
          <stop offset="55%" stopColor={c.botTealMid} />
          <stop offset="100%" stopColor={c.botTealDeep} />
        </radialGradient>
      </defs>
      <rect x="14" y="18" width="72" height="64" rx="30" fill={`url(#${id})`} />
      <rect x="31" y="44.5" width="11" height="11" rx="5.5" fill={c.botTealEye} />
      <rect x="58" y="44.5" width="11" height="11" rx="5.5" fill={c.botTealEye} />
      {talking ? <ellipse cx="50" cy="66" rx="7" ry="4" fill={c.botTealEye} /> : <path d="M42 65 Q50 72 58 65" stroke={c.botTealEye} strokeWidth="3" fill="none" strokeLinecap="round" />}
    </svg>
  );
}
