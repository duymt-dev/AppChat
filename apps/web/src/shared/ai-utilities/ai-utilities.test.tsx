// TIP-019c §4.2–4.3: lệnh gạch chéo chỉ nhận đúng 4 id (lệnh lạ giữ là chữ); kết quả hiển thị theo khuôn — không JSON thô, trạng thái
// trung thực (chưa xong / sai / vô hiệu không bao giờ hiện "xong"); mock: quyền nguồn trước, trích dẫn cắt từ đúng tin, GET trả envelope.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));

import { utilityCommandOf } from './commands';
import { UtilityResult } from './components/UtilityResult';
import { aiUtilityHandlers, aiUtilityParamRoute } from '../api/mock/domains/ai-utilities';
import { mockDb } from '../api/mock/store';

describe('utilityCommandOf', () => {
  it('đúng 4 id (có thể kèm chữ sau); lệnh lạ / chữ thường → null', () => {
    expect(utilityCommandOf('/ai.summarize')).toBe('ai.summarize');
    expect(utilityCommandOf('  /ai.score_lead khách này')).toBe('ai.score_lead');
    expect(utilityCommandOf('/ai.delete_everything')).toBeNull();
    expect(utilityCommandOf('/quote.accept')).toBeNull();
    expect(utilityCommandOf('tóm tắt /ai.summarize')).toBeNull();
  });
});

describe('UtilityResult', () => {
  afterEach(cleanup);
  const env = (o: Record<string, unknown>) => ({ utility_run_id: 'r1', schema_version: 1, state: 'completed', ...o }) as never;

  it('completed: tóm tắt + trích dẫn dạng chữ, không JSON thô; có nút sao chép', () => {
    const { container } = render(<UtilityResult phase="done" envelope={env({ proposal: { summary: 'Khách hỏi giá', bullets: ['Cần gấp'], uncertainties: [], evidence: [{ chunk_id: 'm:1', start: 0, end: 7, quote: 'giá gói' }] } })} />);
    expect(screen.getByTestId('utility-summary').textContent).toContain('Khách hỏi giá');
    expect(screen.getByTestId('utility-evidence').textContent).toBe('giá gói');
    expect(container.textContent).not.toMatch(/[{}"]|chunk_id/);
    expect(screen.getByTestId('utility-copy')).toBeTruthy();
  });

  it('lead thiếu bằng chứng → "chưa đủ", không hiện 0', () => {
    render(<UtilityResult phase="done" envelope={env({ proposal: { rubric_version: 'lead-fit-v1', status: 'insufficient_evidence', score: null, criteria: [], uncertainties: [] } })} />);
    expect(screen.getByTestId('utility-lead').textContent).toContain('insufficient');
    expect(screen.getByTestId('utility-lead').textContent).not.toContain('score:');
  });

  it('failed / invalidated / pending: trạng thái riêng, không có kết quả hay nút sao chép', () => {
    for (const [phase, e, id] of [
      ['done', env({ state: 'failed', reason: 'invalid_citation' }), 'utility-state-failed'],
      ['done', env({ state: 'invalidated' }), 'utility-state-invalidated'],
      ['pending', env({ state: 'pending' }), 'utility-state-pending'],
    ] as const) {
      render(<UtilityResult phase={phase} envelope={e} />);
      expect(screen.getByTestId(id)).toBeTruthy();
      expect(screen.queryByTestId('utility-copy')).toBeNull();
      cleanup();
    }
  });
});

describe('mock ai-utilities', () => {
  const db = mockDb();
  const conv = db.inbox.conversations.find((c) => (db.inbox.messages[c.id] ?? []).some((m) => m.kind === 'text' && m.body))!;
  const msg = db.inbox.messages[conv.id]!.find((m) => m.kind === 'text' && m.body)!;

  it('summarize tin chọn: trích dẫn cắt từ đúng tin; GET trả cùng envelope; id lạ → 404', () => {
    const e = aiUtilityHandlers['ai.summarize']!.execute(db, { source: { kind: 'conversation', conversation_id: conv.id, message_ids: [msg.id] } } as never) as { utility_run_id: string; proposal: { evidence: { chunk_id: string; quote: string }[] } };
    expect(e.proposal.evidence[0]!.chunk_id).toBe(`m:${msg.id}`);
    expect(String(msg.body)).toContain(e.proposal.evidence[0]!.quote);
    expect(aiUtilityParamRoute(`/ai-utilities/${e.utility_run_id}/result`)!(db, {})).toEqual(e);
    expect(() => aiUtilityParamRoute('/ai-utilities/khong-co/result')!(db, {})).toThrow();
  });

  it('tin của hội thoại khác → 404 trước khi tạo kết quả', () => {
    expect(() => aiUtilityHandlers['ai.summarize']!.execute(db, { source: { kind: 'conversation', conversation_id: conv.id, message_ids: ['khong-co'] } } as never)).toThrow();
  });
});
