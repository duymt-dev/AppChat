// Khung giới thiệu bên trái màn đăng nhập / đăng ký (prototype L471–520) — `GET /v1/auth/brand`. Nội dung tiếp thị theo locale,
// cùng dữ liệu fixture prototype (fixtures/prototype-parity/auth.json → brand_card, brand_stats).
export interface AuthBrand {
  card: { initials: string; name: string; meta: string; tag: string; message: string; ai: string };
  stats: { v: string; l: string }[];
}

export const AUTH_BRAND: Record<'vi' | 'en', AuthBrand> = {
  vi: {
    card: {
      initials: 'CL',
      name: 'Chị Lan — Shop Bé Na',
      meta: 'qua Zalo OA · 2 giây trước',
      tag: '#VIP',
      message: 'Mẫu váy họa tiết size 3–5 còn không shop ơi?',
      ai: 'AppChat AI đã soạn reply · còn 47 cái size 3–5 · ship 4h',
    },
    stats: [
      { v: '12K+', l: 'Doanh nghiệp tin dùng' },
      { v: '68%', l: 'Hội thoại AI tự xử' },
      { v: '42s', l: 'Phản hồi TB' },
    ],
  },
  en: {
    card: {
      initials: 'CL',
      name: 'Ms. Lan — Be Na Shop',
      meta: 'via Zalo OA · 2 seconds ago',
      tag: '#VIP',
      message: 'Do you still have the patterned dress in size 3–5?',
      ai: 'AppChat AI drafted a reply · 47 left in size 3–5 · 4h delivery',
    },
    stats: [
      { v: '12K+', l: 'Businesses on board' },
      { v: '68%', l: 'Chats handled by AI' },
      { v: '42s', l: 'Avg. response' },
    ],
  },
};

export const authBrand = (locale: string | undefined): AuthBrand => AUTH_BRAND[locale === 'en' ? 'en' : 'vi'];
