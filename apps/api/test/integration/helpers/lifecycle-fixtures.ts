// Helper test vòng đời workspace (TIP-041): truy vấn quyền quản trị cụm (kiểm DB tenant còn / mất) — chỉ đọc catalog pg_database.
import pg from 'pg';
import { env } from '../setup';

export async function adminQuery(sql: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: env.PROVISIONER_DATABASE_URL });
  await c.connect();
  try {
    return await c.query(sql, params);
  } finally {
    await c.end();
  }
}
