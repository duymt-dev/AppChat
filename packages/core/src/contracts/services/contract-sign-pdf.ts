// Bản PDF đã ký (COMMERCE §9 C1): PDF nội dung đóng băng lúc Owner duyệt & ký + trang chữ ký hai bên + trang chứng nhận ký (mã HĐ,
// mã băm nội dung, các bên, thời điểm, IP, user-agent, kênh OTP, mã giao dịch, nhật ký). Trang ký render HTML → PDF bằng LibreOffice
// (tiếng Việt như chứng từ khác), ghép vào sau nội dung bằng pdf-lib (DV-009). Mã băm `signed_sha256` tính trên tệp cuối.
import { PDFDocument } from 'pdf-lib';
import { createFmt, htmlPage, serverMessages } from '@appchat/shared';
import type { DocRenderer } from '../../documents/public';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
/** Chỉ nhận ảnh PNG base64 (khung ký tay) — chữ ký nhúng `data:` vào HTML; LibreOffice không tải tài nguyên mạng. */
const pngData = (png: string) => (/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) ? png : '');

export interface SignParty {
  label: string;
  name: string;
  signaturePng: string;
  signedAt: Date;
  ip: string | null;
  userAgent: string | null;
  otpChannel: string;
}

export interface CertInput {
  code: string;
  title: string;
  contentSha256: string;
  txId: string;
  locale: string;
  timeZone: string;
  business: SignParty;
  customer: SignParty;
  events: { type: string; at: Date; actor: string; ip: string | null }[];
}

export function certificateHtml(c: CertInput): string {
  const m = serverMessages(c.locale).sales.contract.cert;
  const fmt = createFmt({ locale: c.locale, timeZone: c.timeZone });
  const at = (d: Date) => `${fmt.date(d)} ${fmt.time(d)}`;
  const party = (p: SignParty) => {
    const img = pngData(p.signaturePng);
    return `<td style="width:50%"><b>${esc(p.label)}</b><br>${esc(p.name)}<br>${img ? `<img src="${img}" style="height:60pt;max-width:100%">` : ''}<br>` +
      `<small>${esc(m.signedAt)}: ${esc(at(p.signedAt))}<br>${esc(m.ip)}: ${esc(p.ip ?? '—')}<br>${esc(m.otp)}: ${esc(p.otpChannel)}</small></td>`;
  };
  const row = (k: string, v: string) => `<tr><th style="width:32%;text-align:left">${esc(k)}</th><td style="word-break:break-all">${esc(v)}</td></tr>`;
  const evName = (t: string) => (m.ev as Record<string, string>)[t] ?? t;
  const inner =
    `<h2>${esc(m.title)}</h2>` +
    `<table>${row(m.code, c.code)}${row(m.docHash, c.contentSha256)}${row(m.tx, c.txId)}</table>` +
    `<h3>${esc(m.signature)}</h3><table><tr>${party(c.business)}${party(c.customer)}</tr></table>` +
    `<table>${row(m.business, c.business.name)}${row(m.customer, c.customer.name)}${row(`${m.ua} (B)`, c.customer.userAgent ?? '—')}</table>` +
    `<h3>${esc(m.events)}</h3><table>${c.events.map((e) => `<tr><td>${esc(at(e.at))}</td><td>${esc(evName(e.type))}</td><td>${esc(e.actor)}</td><td>${esc(e.ip ?? '')}</td></tr>`).join('')}</table>` +
    `<p><small>${esc(m.note)}</small></p>`;
  return htmlPage(`${c.code} — ${m.title}`, inner);
}

/** Ghép PDF nội dung + trang chứng nhận → bản cuối. */
export async function mergePdfs(parts: Buffer[]): Promise<Buffer> {
  const out = await PDFDocument.create();
  for (const p of parts) {
    const src = await PDFDocument.load(p);
    for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
  }
  return Buffer.from(await out.save());
}

export async function signedContractPdf(renderer: DocRenderer, content: Buffer, cert: CertInput): Promise<Buffer> {
  return mergePdfs([content, await renderer.htmlPdf(certificateHtml(cert))]);
}
