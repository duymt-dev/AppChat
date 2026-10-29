// Bỏ dấu + chữ thường cho ô tìm của Cài đặt (tìm "thanh vien" ra "Thành viên").
export const foldVi = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
