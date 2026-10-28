# Frontend — Cấu trúc code (`apps/web`)

> Next.js App Router + Ant Design v6 + Ant Design X + TanStack Query + Zustand + next-intl. Một codebase cho desktop (1440) và mobile web.
> Đi cùng: `code/file-size-module-layout.md` (trần 400 dòng), `ui/prototype-parity.md`, `i18n/i18n.md`, `actions/action-registry.md`.

## 1. Cây thư mục

```
apps/web/src/
├── app/                                  # CHỈ routing: page / layout / loading / error / not-found
│   ├── (auth)/ (onboarding)/ (public)/sign/[token]/ (admin)/admin/[section]/
│   └── (app)/layout.tsx · <route>/page.tsx  # page ≤ 120 dòng: đọc params → render <XxxScreen/>
├── features/<module>/                    # một module nghiệp vụ = một thư mục (inbox, customers, quotes, contracts, orders, …)
│   ├── screens/        XxxScreen.tsx     # orchestrator: layout + nối hook với component, không gọi fetch trực tiếp
│   ├── components/     Xxx.tsx           # mỗi drawer / modal / popover / panel / card một file
│   ├── hooks/          useXxx.ts         # query + mutation (qua useAction) + state cục bộ của module
│   ├── api.ts                            # hàm đọc GET + query keys của module (không có hàm ghi)
│   ├── columns.tsx                       # cột DataTable / mobileCard (nếu có bảng)
│   ├── types.ts                          # type riêng cho UI; type nghiệp vụ lấy từ packages/actions | shared
│   ├── ui-commands.ts                    # đăng ký handler UiCommand của module (prefill / open / filter)
│   └── index.ts                          # export công khai của module (screens + component dùng chéo)
├── shared/
│   ├── api/        client.ts (fetch + refresh + X-Workspace-Id + envelope) · query-keys.ts · cursor.ts
│   ├── actions/    useAction.ts · ConfirmActionHost.tsx · UndoToast.tsx
│   ├── authz/      useCan.ts · <Can p="quote.send"> · useScope.ts
│   ├── realtime/   socket.ts · event-invalidation.ts
│   ├── assistant/  AssistantDock · UiCommandBus · AssistantContextProvider
│   ├── shell/      AppShell · NavRail (search, thông báo, Nâng cấp, trial badge, avatar ở đáy rail) · NavFlyout · MobileTabBar · nav-config.ts
│   ├── states/     PageStates · EmptyState · Skeletons · ErrorState
│   └── forms/      zodRule.ts · FormDrawer.tsx · MoneyInput · PhoneInput · DateRange
└── messages/<locale>/<module>.json
packages/ui/                              # theme.ts (token prototype), primitive không biết nghiệp vụ: DataTable, KanbanBoard, FilterBar, EntityDrawer, PageHeader, ResponsiveTable, icons
```

## 2. Quy tắc

1. **`app/` chỉ routing.** Logic, fetch và JSX lớn nằm ở `features/<module>/screens`.
2. **Màn = orchestrator.** `XxxScreen` ≤ 250 dòng, chỉ ghép `PageHeader` + `FilterBar` + `DataTable` / `KanbanBoard` + drawer.
   - Mỗi drawer, modal, popover hay sub-view là một file trong `components/`.
3. **Import một chiều:** `app` → `features` → `shared` → `packages/ui | actions | shared`.
   - `features/a` **không** import `features/b/components/*`; chỉ dùng `features/b` (qua `index.ts`) khi thật cần (ví dụ `ContactPicker`).
   - Không bao giờ import `packages/core` / `db`.
   - Lint bằng `eslint-plugin-boundaries`.
4. **Đọc bằng TanStack Query, ghi bằng `useAction`.**
   - Query key dạng `[module, entity, params]` trong `api.ts`.
   - Mọi thao tác ghi gọi `useAction('quote.send').run(input)`. Hook này tự xử lý 202 preview (mở `ConfirmActionHost`), `invalidates`, toast + nút Hoàn tác, lỗi theo `error.code`.
   - **Cấm `fetch` / `axios` POST trực tiếp trong component.**
5. **Không có state server song song.** Realtime event chỉ invalidate hoặc patch cache (`event-invalidation.ts`). Zustand chỉ cho UI state: dock, shell, mật độ hiển thị.
6. **Form:** antd `Form` + `zodRule(schema)` lấy từ `packages/actions` (cùng schema với server). Form lớn chia section component. Tiền dùng `MoneyInput` (string VND), không dùng `InputNumber` thô.
7. **Phân quyền ở UI:** dùng `useCan('quote.approve')` / `<Can>` để ẩn hoặc vô hiệu hoá; nút ngoài quyền thì ẩn hẳn.
   - Server vẫn kiểm lại; UI không phải lớp bảo vệ.
   - Phạm vi dữ liệu (Của tôi / Nhóm / Tất cả) lấy từ `useScope`; chip "Của tôi" mặc định cho vai trò có scope `own`.
8. **Trợ lý điều khiển được mọi màn:** module khai báo `ui-commands.ts`: `prefill` (điền form), `open` (mở drawer bản ghi), `filter`, `highlight`. Màn nào có form tạo / sửa thì phải có handler `prefill`.
9. **5 trạng thái bắt buộc:** loading (skeleton đúng bố cục prototype), empty (theo prototype), error (nút Thử lại), ready, no-permission. Dùng `PageStates`.
10. **Style:**
    - Chỉ dùng token của `packages/ui/theme.ts` qua antd `ConfigProvider` / `antd-style` (`createStyles`).
    - **Cấm hard-code màu / px**, cấm CSS module rời, cấm inline style ngoài giá trị động.
    - Icon dùng `lucide-react` qua `packages/ui/icons`.
11. **Responsive:**
    - `≥ lg` giống prototype.
    - `md`: rail thu gọn, panel 360° thành Drawer.
    - `< md`: `MobileTabBar`, Drawer `placement="bottom"`, bảng thành `mobileCard`.
    - Breakpoint lấy từ `Grid.useBreakpoint()`, không viết media query tay.
12. **i18n:** mọi chuỗi qua `t()`; tiền / ngày qua `fmt.*`; lỗi qua `errors.<CODE>`.
13. **Hiệu năng:**
    - Bảng lớn dùng virtual (antd Table `virtual`) + cursor infinite query.
    - Drawer / modal nặng dùng `next/dynamic`.
    - Không kéo cả `@ant-design/charts` vào bundle chung; import theo màn.
14. **Đặt tên:**
    - Component `PascalCase.tsx`; hook `useXxx.ts`; file tiện ích `kebab-case.ts`.
    - Mỗi file export một component chính.
    - Props interface đặt cạnh component (`XxxProps`).
15. **Test:**
    - Component logic thì dùng vitest + Testing Library (`*.test.tsx`).
    - Luồng thì dùng Playwright `apps/web/e2e/<module>.spec.ts` (desktop + mobile 390).
    - Màn thì parity `pnpm parity <id>`.

## 3. Ví dụ

```tsx
// app/(app)/quotes/page.tsx
export default function Page({ searchParams }: PageProps) { return <QuotesScreen initialFilter={parseQuoteFilter(searchParams)} />; }

// features/quotes/screens/QuotesScreen.tsx (orchestrator)
export function QuotesScreen({ initialFilter }: QuotesScreenProps) {
  const t = useTranslations('quotes');
  const [filter, setFilter] = useQuoteFilter(initialFilter);
  const query = useQuotesQuery(filter);
  const drawer = useEntityDrawer('quote');
  useQuoteUiCommands(drawer);                         // Trợ lý: prefill / open / filter
  return (
    <PageStates state={stateOf(query)} empty={quotesEmpty}>
      <PageHeader title={t('title')} actions={<Can p="quote.create"><NewQuoteButton /></Can>} kpis={<QuoteKpis filter={filter} />} />
      <FilterBar fields={quoteFilterFields} value={filter} onChange={setFilter} />
      <DataTable columns={quoteColumns} query={query} onRowClick={(r) => drawer.open(r.id)} mobileCard={QuoteCard} />
      <QuoteDrawer {...drawer.props} />
    </PageStates>
  );
}

// features/quotes/components/SendQuoteButton.tsx
const send = useAction('quote.send');
<Button loading={send.isPending} onClick={() => send.run({ quote_id: id, channel: 'auto' })}>{t('send')}</Button>
```
