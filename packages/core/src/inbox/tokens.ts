// Token DI của domain inbox — tách khỏi inbox.module.ts để handler import không vòng về module.
/** Link ký cho tệp đính kèm (`FileLinks` — API public + APP_ENC_KEY); null khi thiếu khoá → gửi tệp trả 501. */
export const FILE_LINKS = Symbol('FILE_LINKS');
