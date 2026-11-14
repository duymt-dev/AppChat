// Bundle parser cô lập (TIP-023f §2.1): chỉ export `extractInput` thuần (không Nest / DB / storage / provider) — tsup gộp thành
// dist/parser.cjs, sandbox.ts nạp bằng tiến trình con `node --permission` chỉ được đọc thư mục dist.
export { extractInput } from '@appchat/core/input-extract';
