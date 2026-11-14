// TIP-023f §2.4: .eml tải lên — tiêu đề mã hoá UTF-8, thân text hoặc HTML đã làm sạch, không cần messageId/from, đính kèm chỉ metadata,
// lồng quá sâu / quá nhiều phần → archive_bounds, quá dài → too_large; không bao giờ mở mạng.
import { describe, expect, it } from 'vitest';
import { EML_MAX_DEPTH, parseUploadedEml } from '../src/email/parse-upload';

const eml = (lines: string[]) => Buffer.from(lines.join('\r\n'));

describe('parseUploadedEml', () => {
  it('tiêu đề UTF-8 mã hoá + thân text, không cần messageId', async () => {
    const r = await parseUploadedEml(eml(['Subject: =?UTF-8?B?QsOhbyBnacOh?=', 'From: Chị Hoa <hoa@example.com>', 'Date: Tue, 10 Nov 2026 08:00:00 +0700', 'Content-Type: text/plain; charset=utf-8', '', 'Mã canary XQ-778 trong thư.']), 10_000);
    expect(r.subject).toBe('Báo giá');
    expect(r.from).toBe('Chị Hoa <hoa@example.com>');
    expect(r.body).toContain('XQ-778');
    expect(r.date).toBe('2026-11-10T01:00:00.000Z');
  });

  it('chỉ HTML → văn bản, bỏ script / ảnh ngoài; header vận chuyển không có trong kết quả', async () => {
    const r = await parseUploadedEml(eml(['Subject: x', 'Received: from evil', 'Authorization: secret', 'Content-Type: text/html', '', '<p>Xin chào</p><script>alert(1)</script><img src="https://track.example/p.gif">']), 10_000);
    expect(r.body).toBe('Xin chào');
    expect(JSON.stringify(r)).not.toMatch(/secret|evil|track\.example/);
  });

  it('đính kèm lồng chỉ liệt kê metadata', async () => {
    const r = await parseUploadedEml(
      eml(['Subject: a', 'Content-Type: multipart/mixed; boundary="B1"', '', '--B1', 'Content-Type: text/plain', '', 'thân', '--B1', 'Content-Type: application/pdf; name="hd.pdf"', 'Content-Disposition: attachment; filename="hd.pdf"', 'Content-Transfer-Encoding: base64', '', 'JVBERi0xLjQK', '--B1--']),
      10_000,
    );
    expect(r.attachments).toEqual([{ name: 'hd.pdf', mime: 'application/pdf', size: expect.any(Number) }]);
    expect(r.body).toBe('thân');
  });

  it('lồng quá sâu → archive_bounds; thân quá dài → too_large', async () => {
    const lines = ['Subject: d'];
    for (let i = 0; i <= EML_MAX_DEPTH; i++) lines.push(`Content-Type: multipart/mixed; boundary="L${i}"`, '', `--L${i}`);
    await expect(parseUploadedEml(eml(lines), 10_000)).rejects.toMatchObject({ reason: 'archive_bounds' });
    await expect(parseUploadedEml(eml(['Subject: b', '', 'x'.repeat(200)]), 100)).rejects.toMatchObject({ reason: 'too_large' });
  });
});
