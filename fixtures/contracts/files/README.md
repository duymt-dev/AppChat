# Tệp mẫu hợp đồng (TIP-030b)

Không có tệp nhị phân trong repo. `build-fixtures.ts` sinh tệp ngay trong bộ nhớ khi test chạy, chỉ dùng thư viện có sẵn của Node.

| Hàm | Tệp |
|---|---|
| `benignDocx()` | DOCX hợp đồng lành tính, chữ tiếng Việt có dấu |
| `pdf({ pages, text })` | PDF tối thiểu có chữ |
| `badDocx.*` | Mỗi hàm cho một lý do từ chối: `externalRelationship`, `macro`, `embeddedObject`, `fieldCode` (DDEAUTO), `pathTraversal`, `zipBomb` (30MB nén), `encrypted` (CFB), `notDocx` |
| `badPdf.*` | Mỗi hàm cho một lý do từ chối: `javascript`, `hexEscapedJs` (`/Java#53cript`), `launch`, `embeddedFile`, `encrypted`, `tooManyPages` (201), `renamedExe` (bytes `MZ`), `notPdf` |

Dùng ở:
- `packages/core/test/document-container-security.test.ts`
- `packages/core/test/contract-file-*.test.ts`
- `apps/api/test/integration/contract-files.test.ts`
