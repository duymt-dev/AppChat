# TIP-020f — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/ai/kb/parse.ts` | Rẽ pptx/ảnh |
| C | `packages/core/src/ai/kb/parsers/pptx.ts` | Parser pptx |
| C | `packages/core/src/ai/kb/parsers/image-ocr.ts` | OCR vision |
| M | `packages/core/src/ai/kb/ingest.ts` | Ước tính + metering OCR |
| C | `packages/core/test/kb-parse-pptx.test.ts` | Unit pptx |
| C | `packages/core/test/kb-ocr.test.ts` | Unit OCR replay |
| C | `packages/core/test/fixtures/kb/sample.pptx` | Fixture |
| C | `fixtures/ai-eval/kb-ocr.json` | Ca live |
