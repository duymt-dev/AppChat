'use client';
import { RouteError } from '@/shared/states/RouteError';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError scope="public" error={error} retry={retry} />;
}
