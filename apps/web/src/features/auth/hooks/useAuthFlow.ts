// Sau khi đăng nhập / xác thực xong: làm mới phiên rồi vào app — cổng onboarding ở (app)/layout lo phần khai báo.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../api';

export function useEnterApp() {
  const qc = useQueryClient();
  const router = useRouter();
  return useCallback(async () => {
    // Tải lại phiên (kể cả khi query đang không dùng) TRƯỚC khi vào app: cổng onboarding đọc dữ liệu cũ `authed:false`
    // trong lúc refetch sẽ đẩy ngược về /login (chế độ http — TIP-011).
    await qc.refetchQueries({ queryKey: authKeys.session, type: 'all' });
    router.replace('/dashboard');
  }, [qc, router]);
}

/** Đếm ngược gửi lại mã (giây). `restart()` khi gửi mã mới. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [round]);
  const restart = useCallback(() => {
    setLeft(seconds);
    setRound((r) => r + 1);
  }, [seconds]);
  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return { left, label, restart };
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
