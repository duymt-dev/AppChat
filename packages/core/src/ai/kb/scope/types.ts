// Ngữ cảnh tri thức tin cậy (TIP-020c §1.1): một restriction phía server cho MỌI lần truy hồi kho — Trợ lý thường, agent có phạm vi, chat
// thử Builder. Không bao giờ dựng từ input model / HTTP `kb.search` (schema công khai giữ `query` / `limit`). Lưu ở `ai_run.knowledge`
// (schema v1, chụp phạm vi chuẩn hoá ≤ 200 thư mục / thẻ) — chạy tiếp đọc lại từ đây; job chỉ mang id run (định vị, không phải quyền).

/** Phạm vi Builder: thư mục HOẶC thẻ (rag §2). Rỗng cả hai = không có tài liệu nào (không phải "tất cả"). */
export interface KbScope {
  folder_ids: string[];
  tags: string[];
}

/** Trần visibility theo chế độ: kênh / khách → chỉ public; làm cho người → theo quyền đọc hiện hành của người đó. */
export type KnowledgeMode = 'channel' | 'commander';

export type KnowledgeContext =
  | { v: 1; kind: 'assistant_unscoped'; user_id: string }
  | {
      v: 1;
      kind: 'agent_scoped';
      agent_id: string;
      /** Phiên bản đã xuất bản lúc nhận run — phạm vi `admitted` lấy từ đây. */
      admitted_version: number;
      scope: KbScope;
      mode: KnowledgeMode;
      commander_id?: string;
      /** Run cha mang restriction (delegate / consult / selected-agent) — chỉ để truy vết, con KHÔNG thừa hưởng quyền rộng hơn của cha. */
      parent_run_id?: string;
    }
  | { v: 1; kind: 'builder_preview'; draft_digest: string; scope: KbScope; commander_id: string; mode: KnowledgeMode; agent_id?: string };

/** Nguồn đã đưa vào run: id + thế hệ nạp (`ingest_seq`) — đổi thế hệ / thư mục / quyền → nội dung phụ thuộc không còn dùng được. */
export interface KnowledgeRef {
  s: string;
  g: number;
  /** Run mang binding đã cho phép nguồn này (run con consult / delegate có phạm vi riêng) — kiểm lại theo binding đó. */
  b: string;
}

/** Lý do an toàn (không lộ tên tài liệu / prompt agent) khi truy hồi bị chặn. */
export type ScopeDenied = 'scope_unavailable' | 'scope_empty' | 'agent_inactive' | 'commander_lost';

export const MAX_SCOPE_ITEMS = 200;
export const MAX_KNOWLEDGE_REFS = 64;
