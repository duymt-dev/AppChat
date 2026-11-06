// TIP-022b C — tệp đính kèm là metadata có kiểu + `attachment_unreadable`: không giả vờ đã đọc; tên an toàn (không đường dẫn / URL / ký tự
// điều khiển); nội dung "canary" trong tệp không bao giờ vào dòng ngữ cảnh của model.
import { describe, expect, it } from 'vitest';
import { ATTACHMENT_RULE, attachmentInfo, attachmentLine } from '../src/ai/reply/attachment-context';

describe('ngữ cảnh tệp', () => {
  it('metadata có kiểu, không đọc nội dung', () => {
    const files = attachmentInfo([{ url: 'https://files.local/s/abc?sig=SECRET', name: '../../etc/<x>hop-dong.pdf', mime: 'application/pdf', size: 1200, fileId: 'f1', content: 'CANARY-7781 khách đồng ý huỷ lịch' }]);
    expect(files).toEqual([{ name: 'xhop-dong.pdf', mime: 'application/pdf', size: 1200, file_ref: 'f1', readable: false, reason: 'attachment_unreadable' }]);
  });

  it('dòng cho model không chứa URL / nội dung tệp', () => {
    const line = attachmentLine('file', '', [{ url: 'https://files.local/s/abc?sig=SECRET', name: 'bien-ban.pdf', mime: 'application/pdf', content: 'CANARY-7781' }]);
    expect(line).toBe('[file — attachment_unreadable: bien-ban.pdf · application/pdf]');
    expect(line).not.toContain('CANARY');
    expect(line).not.toContain('SECRET');
    expect(attachmentLine('image', 'ảnh lỗi', [])).toBe('[image] ảnh lỗi');
    expect(ATTACHMENT_RULE).toContain('không dựa vào tệp để chấp nhận');
  });
});
