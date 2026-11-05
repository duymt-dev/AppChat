// Phát delta khi đang chạy (TIP-023c 6a, đóng DV-006): bước model chạy như một promise, mỗi mảnh chữ đẩy vào hàng đợi; generator của engine
// lấy ra ngay (không đợi bước xong). Kết quả bước = giá trị return của generator; lỗi bước = lỗi khi lấy phần tử kế tiếp.
export function liveStep<T, R>(run: (emit: (v: T) => void) => Promise<R>): AsyncGenerator<T, R, void> {
  const buf: T[] = [];
  let wake: (() => void) | null = null;
  let done = false;
  let result: R | undefined;
  let failure: { err: unknown } | null = null;
  const notify = () => {
    const w = wake;
    wake = null;
    w?.();
  };
  run((v) => {
    buf.push(v);
    notify();
  }).then(
    (r) => {
      result = r;
      done = true;
      notify();
    },
    (err: unknown) => {
      failure = { err };
      done = true;
      notify();
    },
  );
  return (async function* () {
    while (true) {
      while (buf.length) yield buf.shift()!;
      if (done) {
        if (failure) throw (failure as { err: unknown }).err;
        return result as R;
      }
      await new Promise<void>((r) => (wake = r));
    }
  })();
}
