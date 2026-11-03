// Đọc tệp của hợp đồng (TIP-030b spec 17–18): danh sách theo vai trò (nguồn / bản chưa ký / bản đã ký) + tải một tệp — mỗi lần kiểm lại
// scope hợp đồng hiện hành (không thấy → 404) và tệp phải là một trong các cột tệp của CHÍNH hợp đồng đó (id tệp khác → 404, không lộ).
import type { TenantDb } from '@appchat/db';
import { AppError, type ContractFile, type ContractFileRole } from '@appchat/shared';
import type { FilesService } from '../../kernel/files/files.service';
import type { ContractRecord } from '../contract-access';

type Db = Pick<TenantDb, 'file'>;

/** Tệp gắn với hợp đồng theo vai trò (một tệp có thể vừa là nguồn vừa là bản chưa ký — PDF gốc ký nguyên bản). */
export function contractFileIds(c: Pick<ContractRecord, 'sourceFileId' | 'fileId' | 'signedFileId'>): { id: string; role: ContractFileRole }[] {
  const out: { id: string; role: ContractFileRole }[] = [];
  if (c.sourceFileId) out.push({ id: c.sourceFileId, role: 'source' });
  if (c.fileId && c.fileId !== c.sourceFileId) out.push({ id: c.fileId, role: 'unsigned' });
  if (c.signedFileId) out.push({ id: c.signedFileId, role: 'signed' });
  return out;
}

const extOf = (name: string, mime: string) => (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? (mime === 'application/pdf' ? 'pdf' : 'docx')).toLowerCase();

export async function listContractFiles(db: Db, c: ContractRecord, names: (ids: string[]) => Promise<Map<string, string>>): Promise<ContractFile[]> {
  const refs = contractFileIds(c);
  if (!refs.length) return [];
  const rows = await db.file.findMany({ where: { id: { in: refs.map((r) => r.id) } }, select: { id: true, name: true, mime: true, size: true, sha256: true, uploadedBy: true, createdAt: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const who = await names(rows.map((r) => r.uploadedBy).filter((x): x is string => !!x));
  return refs.flatMap(({ id, role }) => {
    const f = byId.get(id);
    return f ? [{ id, role, name: f.name, mime: f.mime, ext: extOf(f.name, f.mime), size: Number(f.size), sha256: f.sha256 ?? '', at: f.createdAt.toISOString(), by: (f.uploadedBy && who.get(f.uploadedBy)) || '' }] : [];
  });
}

/** Bytes một tệp của hợp đồng — tệp không thuộc hợp đồng → 404. */
export async function readContractFile(db: Db, files: FilesService, c: ContractRecord, fileId: string) {
  if (!contractFileIds(c).some((r) => r.id === fileId)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
  const f = await files.read(db, fileId);
  if (!f) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
  return f;
}
