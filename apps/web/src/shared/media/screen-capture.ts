// Chụp một khung màn hình (TIP-025b §F.4) — chỉ gọi từ thao tác của người dùng: trình duyệt hỏi quyền + người chọn tab / cửa sổ / màn
// hình; lấy ĐÚNG một khung rồi dừng ngay mọi track (không quay nền, không âm thanh). Không tự tải lên — trả Blob để xem trước.
// Dùng lại được cho Trợ lý (023d) nhưng không có đường gọi từ model.

export type CaptureResult = { ok: true; blob: Blob } | { ok: false; reason: 'unsupported' | 'denied' | 'failed' };

export const canCaptureScreen = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function';

export async function captureScreenFrame(): Promise<CaptureResult> {
  if (!canCaptureScreen()) return { ok: false, reason: 'unsupported' };
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch (e) {
    return { ok: false, reason: (e as { name?: string })?.name === 'NotAllowedError' ? 'denied' : 'failed' };
  }
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    video.srcObject = null;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    return blob ? { ok: true, blob } : { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
