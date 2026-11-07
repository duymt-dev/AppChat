'use client';
import type { ReactNode } from 'react';
import type { PermissionKey } from '@appchat/shared';
import { useCan } from './useCan';

export interface CanProps {
  p: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ p, children, fallback = null }: CanProps) {
  return useCan(p) ? children : fallback;
}
