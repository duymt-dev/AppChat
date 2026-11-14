// Điều phối ký của khách (TIP-030c §1.6, §3.1–3.2, §3.7): prepare (action riêng, kiểm OTP — sai ghi bền rồi ném 422 / 410 SAU commit) →
// claim lượt render theo thế hệ → đọc đúng tệp đã đóng băng (hash khớp) + render trang chứng nhận NGOÀI transaction / khoá → tải lên ứng viên
// chưa xác nhận, đọc lại SHA → stage (action riêng, chỉ lượt đang giữ) → chốt `contract.public_sign`. Trả SignView chỉ SAU commit chốt;
// cùng request gửi lại → biên nhận cũ (không render / ký / gửi lần hai); đang render ở tiến trình khác → 409 in_progress.
import { AppError, SIGN_OTP_MAX_FAILS, serverMessages } from '@appchat/shared';
import type { TenantDb, TenantDbResolver } from '@appchat/db';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { uuidv7 } from '../../kernel/ids';
import type { ContractDeps } from '../services/contract-deps';
import { signedContractPdf, type SignParty } from '../services/contract-sign-pdf';
import { attemptDigest, attemptPhase, claimRender, pngBytes } from './attempts';
import { runPublicSigning, type ResolvedToken } from './module';
import { signInvalid } from './read';

type Client = { ip: string | null; userAgent: string | null };
type Prep = { attempt_id: string; disposition: string; remaining_attempts: number | null; rejection_code: string | null };

export async function signCustomer(d: ContractDeps, executor: Pick<ActionExecutor, 'execute'>, tenants: TenantDbResolver | null, r: ResolvedToken, ref: string, client: Client, otp: string, png: string, now: () => Date): Promise<void> {
  pngBytes(png);
  const key = d.need('env').key;
  const secret = { otp, signaturePng: png };
  const prep = await runPublicSigning<Prep>(executor, tenants, r, 'contract.sign_attempt_prepare', ref, { party: 'customer', input_digest: attemptDigest(key, otp, png) }, { client, contractVersion: 0, secret });
  if (prep.disposition === 'rejected') {
    // Kế toán lỗi đã commit — giờ mới báo lỗi (lần thứ 5 khoá link như trước).
    if (prep.rejection_code === 'locked') throw signInvalid();
    throw new AppError('OTP_INVALID', 422, { otp: prep.rejection_code === 'expired' ? 'expired' : 'invalid' }, String(prep.remaining_attempts ?? SIGN_OTP_MAX_FAILS));
  }
  if (prep.disposition === 'finalized') return;
  if (prep.disposition === 'stale' || prep.disposition === 'expired') throw signInvalid();
  const attemptId = prep.attempt_id;
  if (prep.disposition === 'verified') await renderAndStage(d, executor, tenants, r, ref, attemptId, client, png, now);
  const phase = await attemptPhase(r.db, attemptId);
  if (phase !== 'staged' && phase !== 'finalized') throw signInvalid();
  const fin = await runPublicSigning<{ disposition: string }>(executor, tenants, r, 'contract.public_sign', `${ref}:final`, { attempt_id: attemptId }, { client, contractVersion: 0 });
  if (fin.disposition !== 'finalized') throw signInvalid();
}

async function renderAndStage(d: ContractDeps, executor: Pick<ActionExecutor, 'execute'>, tenants: TenantDbResolver | null, r: ResolvedToken, ref: string, attemptId: string, client: Client, png: string, now: () => Date) {
  const claim = await claimRender(r.db, attemptId, now());
  if (!claim) return;
  const stage = (outcome: 'staged' | 'stale', extra: Record<string, unknown> = {}) =>
    runPublicSigning(executor, tenants, r, 'contract.sign_attempt_stage', `${ref}:stage:${claim.generation}`, { attempt_id: attemptId, render_generation: claim.generation, outcome, ...extra }, { client, contractVersion: 0 });
  const c = await r.db.contract.findUnique({ where: { id: r.t.contractId } });
  const files = d.need('files');
  if (!c?.fileId || !d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' });
  const content = await files.read(r.db, c.fileId);
  // Tệp đã đóng băng mất / bị đổi → không dựng lại bản "gốc" (lần thử stale, lỗi rõ ràng).
  if (!content || content.row.sha256 !== c.fileSha256) {
    await stage('stale');
    throw new AppError('INVALID_STATE', 409, { file: 'original_unavailable' });
  }
  const at = now();
  const pdf = await signedContractPdf(d.renderer, content.body, await certificate(d, r.db, r.ws, c, r.t.signerId, png, client, at));
  const stored = await files.upload(r.db, r.ws, { name: interpolateName(await d.place(r.ws), c.code), mime: 'application/pdf', body: pdf, purpose: 'document', uploadedBy: null });
  const sig = await files.upload(r.db, r.ws, { name: `${c.code}-chu-ky-ben-b.png`, mime: 'image/png', body: pngBytes(png), purpose: 'document', uploadedBy: null });
  // Đọc lại đúng bytes đã lưu (SHA của tệp cuối là bằng chứng, không phải hash bộ nhớ).
  const back = await files.read(r.db, stored.id);
  if (!back || back.row.sha256 !== stored.sha256) throw new AppError('INTERNAL', 500, { file: 'readback_mismatch' });
  await stage('staged', { candidate_file_id: stored.id, signature_file_id: sig.id, candidate_sha256: stored.sha256 });
}

const interpolateName = (p: { locale: string }, code: string) => serverMessages(p.locale).sales.contract.signedPdfName.replace('{code}', code);

async function certificate(d: ContractDeps, db: TenantDb, ws: string, c: { id: string; code: string; title: string; fileSha256: string | null }, signerId: string, png: string, client: Client, at: Date) {
  const files = d.need('files');
  const [s, biz, events] = await Promise.all([
    db.contractSigner.findUniqueOrThrow({ where: { id: signerId } }),
    db.contractSigner.findUnique({ where: { contractId_party: { contractId: c.id, party: 'business' } } }),
    db.contractSignatureEvent.findMany({ where: { contractId: c.id }, orderBy: { createdAt: 'asc' } }),
  ]);
  const bizSig = biz?.signatureImageFileId ? await files.read(db, biz.signatureImageFileId) : null;
  const p = await d.place(ws);
  const cm = serverMessages(p.locale).sales.contract.cert;
  const party = (x: { name: string; signedAt: Date | null; ip: string | null; userAgent: string | null; otpChannel: string | null }, label: string, sig: string): SignParty => ({ label, name: x.name, signaturePng: sig, signedAt: x.signedAt ?? at, ip: x.ip, userAgent: x.userAgent, otpChannel: x.otpChannel ?? 'email' });
  return {
    code: c.code,
    title: c.title,
    contentSha256: c.fileSha256 ?? '',
    txId: uuidv7(at.getTime()),
    locale: p.locale,
    timeZone: p.timeZone,
    business: party({ name: biz?.name ?? '', signedAt: biz?.signedAt ?? null, ip: biz?.ip ?? null, userAgent: biz?.userAgent ?? null, otpChannel: 'email' }, cm.business, bizSig ? `data:image/png;base64,${bizSig.body.toString('base64')}` : ''),
    customer: party({ name: s.name, signedAt: at, ip: client.ip, userAgent: client.userAgent, otpChannel: s.otpChannel }, cm.customer, png),
    events: [...events.map((e) => ({ type: e.type, at: e.createdAt, actor: e.actorName, ip: e.ip })), { type: 'otp_ok', at, actor: s.name, ip: client.ip }, { type: 'signed', at, actor: s.name, ip: client.ip }],
  };
}
