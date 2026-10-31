// TIP-018 AC1: gom thread (References / In-Reply-To / thư mới), html → text, bỏ trích dẫn, bỏ thư do chính hộp thư gửi; adapter
// + transport giả: kiểm tra đăng nhập, poll theo mốc UID (lần đầu theo ngày, UIDVALIDITY đổi → theo ngày), gửi giữ header thread.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ChannelAuthError,
  EmailAdapter,
  FAKE_MAIL_HOST,
  FAKE_MAIL_PASSWORD,
  FakeMailboxTransport,
  MailAuthError,
  MailConnectError,
  htmlToText,
  normalizeMail,
  stripQuoted,
  threadRoot,
  type MailCredentials,
  type ParsedMail,
} from '../src';

const mail = (p: Partial<ParsedMail> = {}): ParsedMail => ({
  uid: 1,
  messageId: '<m1@khach.vn>',
  references: [],
  from: { address: 'Lan@Khach.vn', name: 'Chị Lan' },
  to: ['cskh@spa.vn'],
  subject: 'Hỏi lịch HIFU',
  text: 'Spa còn lịch chiều nay không?',
  date: new Date('2026-10-31T02:00:00Z'),
  attachments: [],
  ...p,
});

describe('chuẩn hoá thư', () => {
  it('thread = References[0] → In-Reply-To → chính thư; id có ngoặc nhọn', () => {
    expect(threadRoot(mail())).toBe('<m1@khach.vn>');
    expect(threadRoot(mail({ messageId: '<m2@x>', inReplyTo: 'r1@spa.vn' }))).toBe('<r1@spa.vn>');
    expect(threadRoot(mail({ messageId: '<m3@x>', inReplyTo: '<m2@x>', references: ['<m1@khach.vn>', '<m2@x>'] }))).toBe('<m1@khach.vn>');
  });

  it('html → text; bỏ phần trích dẫn (tiếng Anh / tiếng Việt / dòng ">")', () => {
    expect(htmlToText('<style>p{}</style><p>Chào&nbsp;shop</p><div>Giá <b>bao nhiêu</b>?<br>Cảm ơn &amp; hẹn gặp</div>')).toBe('Chào shop\nGiá bao nhiêu?\nCảm ơn & hẹn gặp');
    expect(stripQuoted('Dạ em đặt 15h ạ\n\nOn Fri, 31 Oct 2026 at 09:00, CSKH <cskh@spa.vn> wrote:\n> Dạ còn lịch 15h ạ')).toBe('Dạ em đặt 15h ạ');
    expect(stripQuoted('Ok chị\nVào 9:00 Thứ Sáu, CSKH đã viết:\n> abc')).toBe('Ok chị');
    expect(stripQuoted('> chỉ trích dẫn')).toBe('> chỉ trích dẫn');
  });

  it('thư mới mang tiêu đề lên đầu; trả lời chỉ nội dung; người gửi chữ thường; thư của chính hộp thư bỏ qua', () => {
    const n = normalizeMail('acc1', 'cskh@spa.vn', mail())!;
    expect(n).toMatchObject({
      channelAccountId: 'acc1',
      externalThreadId: '<m1@khach.vn>',
      externalMsgId: '<m1@khach.vn>',
      isGroup: false,
      sender: { externalId: 'lan@khach.vn', name: 'Chị Lan', email: 'lan@khach.vn' },
      kind: 'text',
      text: 'Hỏi lịch HIFU\n\nSpa còn lịch chiều nay không?',
      raw: { subject: 'Hỏi lịch HIFU', references: ['<m1@khach.vn>'] },
    });
    const reply = normalizeMail('acc1', 'cskh@spa.vn', mail({ messageId: '<m2@khach.vn>', inReplyTo: '<o1@spa.vn>', references: ['<m1@khach.vn>', '<o1@spa.vn>'], subject: 'Re: Hỏi lịch HIFU', text: 'Dạ 15h ạ\n> cũ', html: undefined }))!;
    expect(reply).toMatchObject({ externalThreadId: '<m1@khach.vn>', text: 'Dạ 15h ạ', raw: { references: ['<m1@khach.vn>', '<o1@spa.vn>', '<m2@khach.vn>'] } });
    expect(normalizeMail('acc1', 'CSKH@spa.vn', mail({ from: { address: 'cskh@spa.vn' } }))).toBeNull();
    expect(normalizeMail('acc1', 'cskh@spa.vn', mail({ text: '', html: '<p>Gửi file</p>' }))!.text).toBe('Hỏi lịch HIFU\n\nGửi file');
  });
});

describe('adapter email + transport giả', () => {
  let t: FakeMailboxTransport;
  let a: EmailAdapter;
  const creds: MailCredentials = { address: 'cskh@spa.vn', imap_host: FAKE_MAIL_HOST, imap_port: 993, password: FAKE_MAIL_PASSWORD, smtp_host: 'smtp.fake.test', smtp_port: 465 };
  const now = new Date();

  beforeEach(async () => {
    t = new FakeMailboxTransport();
    a = new EmailAdapter(t);
    await a.start({ id: 'acc1', workspaceId: 'ws', type: 'email', credentials: creds, settings: { history_days: 7 } }, { push: async () => undefined });
  });

  it('kiểm tra đăng nhập: sai mật khẩu → MailAuthError; sai máy chủ → MailConnectError', async () => {
    await expect(a.verify(creds)).resolves.toBeUndefined();
    await expect(a.verify({ ...creds, password: 'sai' })).rejects.toBeInstanceOf(MailAuthError);
    await expect(a.verify({ ...creds, imap_host: 'imap.khong-co.vn' })).rejects.toBeInstanceOf(MailConnectError);
  });

  it('poll: lần đầu theo ngày (bỏ thư cũ hơn history_days), lần sau theo mốc UID; UIDVALIDITY đổi → theo ngày lại', async () => {
    t.deliver('cskh@spa.vn', { from: { address: 'cu@khach.vn' }, subject: 'Thư cũ', text: 'cũ', date: new Date(now.getTime() - 30 * 86_400_000) });
    t.deliver('cskh@spa.vn', { from: { address: 'lan@khach.vn' }, subject: 'Hỏi giá', text: 'Giá gói 6 buổi?' });
    const p1 = await a.poll('acc1', null, now);
    expect(p1.messages.map((m) => m.text)).toEqual(['Hỏi giá\n\nGiá gói 6 buổi?']);
    expect(p1.cursor).toEqual({ uidValidity: '1', sinceUid: 3 });
    expect((await a.poll('acc1', p1.cursor, now)).messages).toEqual([]);
    t.deliver('cskh@spa.vn', { from: { address: 'lan@khach.vn' }, subject: 'Re: Hỏi giá', text: 'Thêm 1 câu', inReplyTo: '<x@spa>' });
    const p2 = await a.poll('acc1', p1.cursor, now);
    expect(p2.messages.map((m) => m.text)).toEqual(['Thêm 1 câu']);
    t.resetValidity('cskh@spa.vn');
    expect((await a.poll('acc1', p2.cursor, now)).messages).toHaveLength(2);
  });

  it('send: trả lời "Re: …" + In-Reply-To / References; thư mở chuỗi mới giữ Message-ID đặt trước; sai mật khẩu → ChannelAuthError', async () => {
    const r = await a.send('acc1', { externalThreadId: '<m1@khach.vn>', externalThreadTo: 'lan@khach.vn', kind: 'text', text: 'Dạ còn 15h ạ', meta: { subject: 'Hỏi lịch HIFU', inReplyTo: '<m2@khach.vn>', references: ['<m1@khach.vn>', '<m2@khach.vn>'] } });
    expect(t.sent[0]).toMatchObject({ to: 'lan@khach.vn', subject: 'Re: Hỏi lịch HIFU', inReplyTo: '<m2@khach.vn>', references: ['<m1@khach.vn>', '<m2@khach.vn>'], text: 'Dạ còn 15h ạ', messageId: r.externalMsgId });
    await a.send('acc1', { externalThreadId: '<n1@spa.vn>', externalThreadTo: 'mai@khach.vn', kind: 'text', text: 'Chào chị', meta: { subject: 'Theo dõi sau tư vấn', messageId: '<n1@spa.vn>' } });
    expect(t.sent[1]).toMatchObject({ subject: 'Theo dõi sau tư vấn', messageId: '<n1@spa.vn>' });
    await a.stop('acc1');
    await a.start({ id: 'acc1', workspaceId: 'ws', type: 'email', credentials: { ...creds, password: 'doi-roi' }, settings: {} }, { push: async () => undefined });
    await expect(a.send('acc1', { externalThreadId: 'x', externalThreadTo: 'a@b.vn', kind: 'text', text: 'x' })).rejects.toBeInstanceOf(ChannelAuthError);
    await expect(a.poll('acc1', null)).rejects.toBeInstanceOf(ChannelAuthError);
    expect(await a.probe('acc1')).toBe('expired');
  });
});
