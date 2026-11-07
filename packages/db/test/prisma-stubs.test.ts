// TIP-001 AC11: stub Prisma đúng tên + thư mục theo bản đồ sở hữu (02-TASK-GRAPH.md), mỗi file ghi TIP chủ.
// `_base.prisma` (generator + datasource, TIP-002) không thuộc domain nào.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', 'prisma');

const OWNERS: Record<'platform' | 'tenant', Record<string, string>> = {
  platform: {
    ops: '002', routing: '002', identity: '004', billing: '009', 'billing-payments': '010', 'billing-lifecycle': '039',
    integrations: '012', 'ai-config': '019', templates: '021', notify: '006', 'commerce-links': '032b', 'action-operations': '045b', 'workspace-lifecycle': '041',
  },
  tenant: {
    kernel: '002', authz: '005', integrations: '012', channels: '014', 'channels-webchat': '017', 'channels-email': '018', crm: '015',
    inbox: '016', 'ai-runs': '019', 'ai-usage': '019b', 'ai-kb': '020', 'ai-agents': '021', 'ai-assistant': '023', 'ai-tasks': '035',
    catalog: '027', documents: '028', 'sales-quotes': '029', contracts: '030', 'contract-appendix-signing': '030b', 'catalog-import': '032b', 'sales-orders': '031',
    'sales-payments': '032', 'commerce-settings': '032b', booking: '033', support: '034', loyalty: '036', marketing: '037', 'data-jobs': '045b',
    'channel-operations': '014b', 'ai-channel-behavior': '022b', insights: '038', 'data-transfer': '038b', 'inbox-ui': '025b',
  },
};

describe('prisma stubs', () => {
  it.each(['platform', 'tenant'] as const)('%s: đúng tập file của bản đồ sở hữu', (kind) => {
    const files = readdirSync(join(ROOT, kind)).filter((f) => f.endsWith('.prisma') && f !== '_base.prisma').map((f) => f.replace('.prisma', ''));
    expect(files.sort()).toEqual(Object.keys(OWNERS[kind]).sort());
  });

  it('46 file, mỗi file ghi đúng TIP chủ ở dòng đầu', () => {
    let n = 0;
    for (const kind of ['platform', 'tenant'] as const) {
      for (const [file, tip] of Object.entries(OWNERS[kind])) {
        const head = readFileSync(join(ROOT, kind, `${file}.prisma`), 'utf8').split('\n')[0];
        expect(head).toBe(`// ${kind}/${file}.prisma — sở hữu: TIP-${tip} (02-TASK-GRAPH.md → Bản đồ sở hữu file).`);
        n++;
      }
    }
    expect(n).toBe(46);
  });
});
