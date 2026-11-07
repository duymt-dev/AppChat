// CSS của widget — nằm trong Shadow DOM (không rò sang / bị ảnh hưởng bởi CSS website khách). Màu chủ đạo `--ac` theo cấu hình
// widget (mặc định xanh AppChat #2DC56A — token brand của prototype). Không thuộc phạm vi token apps/web (lint:tokens chỉ quét apps/web).
export const CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.launcher{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:var(--ac);color:#fff;
  box-shadow:0 8px 24px rgba(17,24,39,.22);display:flex;align-items:center;justify-content:center;z-index:2147483000}
.launcher svg{width:26px;height:26px}
.win{position:fixed;right:20px;bottom:92px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;
  border-radius:16px;box-shadow:0 16px 48px rgba(17,24,39,.24);display:flex;flex-direction:column;overflow:hidden;z-index:2147483000}
.win[hidden]{display:none}
.head{background:var(--ac);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:8px}
.title{font-weight:700;font-size:15px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.x{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;line-height:1}
.body{flex:1;overflow-y:auto;padding:12px;background:#F9FAFB;display:flex;flex-direction:column;gap:8px}
.msg{max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.in{align-self:flex-end;background:var(--ac);color:#fff;border-bottom-right-radius:4px}
.out{align-self:flex-start;background:#fff;color:#231F20;border:1px solid #E5E7EB;border-bottom-left-radius:4px}
.fail{opacity:.6;cursor:pointer}
.note{font-size:12px;color:#6B7280;text-align:center;padding:4px 8px}
.foot{display:flex;gap:8px;padding:10px;border-top:1px solid #E5E7EB;background:#fff}
.inp{flex:1;border:1px solid #E5E7EB;border-radius:10px;padding:9px 12px;font-size:14px;outline:none;resize:none;max-height:96px}
.inp:focus{border-color:var(--ac)}
.send{background:var(--ac);color:#fff;border:0;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer}
.send:disabled{opacity:.5;cursor:default}
.pre{display:flex;flex-direction:column;gap:8px;padding:16px;background:#fff;border-top:1px solid #E5E7EB}
.pre .lbl{font-size:13px;font-weight:600;color:#231F20}
.pre input{border:1px solid #E5E7EB;border-radius:10px;padding:9px 12px;font-size:14px;outline:none}
.pre input:focus{border-color:var(--ac)}
.err{font-size:12px;color:#DC2626;min-height:16px}
@media (max-width:480px){.win{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0}}
`;

export const CHAT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
