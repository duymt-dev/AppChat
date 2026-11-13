// Lỗi giả CHỈ ở chế độ mock (TIP-001b AC2): `localStorage.ac_mock_fault = '<chỗ>'` làm probe ném lỗi khi render để E2E kiểm error
// boundary route / panel bằng đường lỗi thật của React — chế độ http / production không bao giờ ném.
'use client';
import { apiMode } from '../api/transport';

export const MOCK_FAULT_KEY = 'ac_mock_fault';

const armed = (at: string): boolean => {
  if (apiMode() !== 'mock' || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MOCK_FAULT_KEY) === at;
  } catch {
    return false;
  }
};

export function MockFaultProbe({ at }: { at: string }) {
  if (armed(at)) throw new Error(`mock fault: ${at}`);
  return null;
}
