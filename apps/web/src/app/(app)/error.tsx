'use client';
import { RouteError } from '@/shared/states/RouteError';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError scope="app" error={error} retry={retry} />;
}
