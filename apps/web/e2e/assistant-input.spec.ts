// TIP-023f E2E (mock): tệp → tải lên → đang đọc nội dung → sẵn sàng → Gửi (khoá Gửi khi chưa sẵn sàng); chỉ gửi tệp (không chữ) bằng
// Gửi tường minh → bong bóng có chip tệp + trả lời có đoạn trích; tệp lỗi có lý do + thử lại; đuôi lạ bị từ chối sớm; chụp màn hình
// (getDisplayMedia giả) → xem lại → Đính kèm (không tự gửi), track dừng; mở menu ＋ không chụp; đọc chính tả (SpeechRecognition giả) →
// thông báo → nghe → xem lại sửa được → Chèn (không tự gửi); mobile 390 không tràn ngang. Mock là mô phỏng hợp đồng — HTTP chạy parser thật.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';
const box = (page: Page) => page.getByTestId('asst-composer').locator('textarea');

async function fakeMedia(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __tracks: number; __captures: number };
    w.__tracks = 0;
    w.__captures = 0;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 24;
    const paint = () => {
      const g = canvas.getContext('2d');
      if (g) (g.fillStyle = '#2DC56A'), g.fillRect(0, 0, 32, 24);
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getDisplayMedia: async () => {
          w.__captures++;
          paint();
          const s = canvas.captureStream(10);
          setInterval(paint, 50);
          s.getTracks().forEach((t) => {
            const stop = t.stop.bind(t);
            t.stop = () => (w.__tracks++, stop());
          });
          return s;
        },
      },
    });
    class FakeRec {
      lang = '';
      interimResults = false;
      continuous = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'tóm tắt' } }] }), 50);
        setTimeout(() => this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'tóm tắt hợp đồng' } }] }), 100);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRec;
  });
}

test.describe('assistant-input', () => {
  test('tệp chữ: đang đọc → sẵn sàng (Gửi khoá tới lúc đó) → chỉ gửi tệp → chip tệp + đoạn trích; khay rỗng sau khi gửi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${Q}`);
    await page.getByTestId('asst-attach-input').setInputFiles({ name: 'hop-dong.txt', mimeType: 'text/plain', buffer: Buffer.from('Điều 1: thanh toán trong 30 ngày') });
    const chip = page.getByTestId('asst-attachment');
    await expect(chip).toHaveAttribute('data-status', /uploading|preparing/);
    await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 10_000 });
    await expect(page.getByTestId('asst-send')).toBeEnabled();
    await page.getByTestId('asst-send').click();
    await expect(page.getByTestId('asst-user-file')).toContainText('hop-dong.txt');
    await expect(page.getByTestId('asst-ai-msg').last()).toContainText('thanh toán trong 30 ngày');
    await expect(page.getByTestId('asst-attachments')).toHaveCount(0);
  });

  test('tệp hỏng → lỗi có lý do, Gửi khoá; bỏ tệp → mở khoá; đuôi lạ bị từ chối sớm', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${Q}`);
    await page.getByTestId('asst-attach-input').setInputFiles([
      { name: 'bao-gia-corrupt.txt', mimeType: 'text/plain', buffer: Buffer.from('x') },
      { name: 'macro.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') },
    ]);
    const chip = page.getByTestId('asst-attachment');
    await expect(chip).toHaveCount(1);
    await expect(chip).toHaveAttribute('data-status', 'error', { timeout: 10_000 });
    await expect(chip.getByTestId('asst-attachment-reason')).toHaveText('Tệp hỏng');
    await expect(page.getByTestId('asst-send')).toBeDisabled();
    await box(page).fill('Đọc giúp');
    await box(page).press('Enter');
    await expect(page.getByTestId('asst-user-msg')).toHaveCount(0);
    await expect(box(page)).toHaveValue('Đọc giúp');
    await chip.getByTestId('asst-attachment-remove').click();
    await expect(page.getByTestId('asst-send')).toBeEnabled();
  });

  test('chụp màn hình: mở menu ＋ không chụp; bấm chụp → xem lại → Đính kèm vào khay (không tự gửi), track đã dừng', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await fakeMedia(page);
    await page.goto(`/assistant${Q}`);
    await page.getByTestId('asst-plus').click();
    expect(await page.evaluate(() => (window as unknown as { __captures: number }).__captures)).toBe(0);
    await page.getByTestId('asst-plus-screenshot').click();
    await expect(page.getByTestId('asst-capture')).toHaveAttribute('data-state', 'review');
    expect(await page.evaluate(() => (window as unknown as { __tracks: number }).__tracks)).toBeGreaterThan(0);
    await page.getByTestId('asst-capture-accept').click();
    await expect(page.getByTestId('asst-attachment')).toHaveAttribute('data-status', 'ready', { timeout: 10_000 });
    await expect(page.getByTestId('asst-user-msg')).toHaveCount(0);
  });

  test('đọc chính tả: thông báo → nghe (chữ tạm) → xem lại sửa được → Chèn vào ô soạn, không tự gửi', async ({ page }) => {
    test.skip(isMobile(page), 'mic ẩn < md');
    await fakeMedia(page);
    await page.goto(`/assistant${Q}`);
    await box(page).fill('Xin chào ');
    await page.getByTestId('asst-mic').click();
    await expect(page.getByTestId('asst-dictation-notice')).toBeVisible();
    await page.getByTestId('asst-dictation-start').click();
    await expect(page.getByTestId('asst-dictation')).toHaveAttribute('data-state', 'listening');
    await expect(page.getByTestId('asst-dictation-interim')).toHaveText('tóm tắt hợp đồng');
    await page.getByTestId('asst-dictation-stop').click();
    await expect(page.getByTestId('asst-dictation-text')).toHaveValue('tóm tắt hợp đồng');
    await page.getByTestId('asst-dictation-text').fill('tóm tắt hợp đồng A');
    await page.getByTestId('asst-dictation-insert').click();
    await expect(box(page)).toHaveValue('Xin chào tóm tắt hợp đồng A');
    await expect(page.getByTestId('asst-user-msg')).toHaveCount(0);
  });

  test('mobile 390: khay tệp không tràn ngang, nút bỏ tệp đủ lớn', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/assistant${Q}`);
    await page.getByTestId('asst-attach-input').setInputFiles({ name: 'mot-ten-tep-rat-dai-de-kiem-tra-tran-ngang-tren-di-dong.txt', mimeType: 'text/plain', buffer: Buffer.from('nội dung') });
    await expect(page.getByTestId('asst-attachment')).toHaveAttribute('data-status', 'ready', { timeout: 10_000 });
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('asst-attachment-remove'));
  });
});
