// Màu avatar người dùng suy ổn định từ id (Cài đặt › Thành viên — prototype L5861 dùng 3 màu xanh lá / tím / xanh dương).
const AVATAR_COLORS = ['#16A34A', '#7C3AED', '#2563EB', '#DB2777', '#0E9B7E', '#F59E0B'] as const;

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}
