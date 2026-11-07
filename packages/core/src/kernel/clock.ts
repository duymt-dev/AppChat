// Đồng hồ của kernel: nghiệp vụ lấy giờ qua Clock, không gọi Date.now() trực tiếp (standards/code/testing.md §4).
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Đồng hồ cố định cho test; `advance` dịch thời gian theo ms. */
export class FixedClock implements Clock {
  private ms: number;

  constructor(at: Date | string | number) {
    this.ms = new Date(at).getTime();
  }

  now(): Date {
    return new Date(this.ms);
  }

  advance(ms: number): void {
    this.ms += ms;
  }

  set(at: Date | string | number): void {
    this.ms = new Date(at).getTime();
  }
}
