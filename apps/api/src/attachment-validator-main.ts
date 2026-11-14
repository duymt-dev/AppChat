// Bundle kiểm cấu trúc tệp đính kèm bản ghi (TIP-032d §2.1): chỉ export `validateAttachment` thuần (không Nest / DB / storage / AI parser) —
// tsup gộp thành dist/attachment-validator.cjs, kernel/files/attachment-validation.ts nạp bằng tiến trình con `node --permission`.
export { validateAttachment } from '@appchat/core/attachment-validator';
