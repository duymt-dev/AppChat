# Commerce attachments/media — independent source inventory 2026-11-02

Read-only inventory by audit_remaining_requirements; no runtime acceptance.

## Order/invoice record attachments

PRO-orders-files and PRO-invoices-files: Orders DetailTabs194–226 and Invoice DetailTabs181–213 open/upload only toast. Drawers do not pass target identity. order-insights60/75 returns empty files. invoices-read118–122 has generated PDF metadata without file identity; these are immutable evidence, not user attachments. FilesController64–78 uses uploader/Owner/kb.manage, not current record authority; FilesService35–45 stores upload only, no record association.

032d plan covers distinct order/payment adapters, canonical attach/detach/list, actual Drawer/Panel identity, existing upload/download guard registration, scoped byte readback, privacy/GC and protected immutable generated evidence. AI-first uses023f approved handle→current target→preview/confirm→receipt; manual same actions without model. No arbitrary model URL, implicit public URL or foreign-record UUID reuse.

## Product media/formatting remains separate

REQ-F05b, PRO-products-files and PRO-products-richtext remain unowned. catalog.prisma67/catalog.ts19 description is string, no image model. catalog-read109 files empty; api/catalog63 tuple metadata no IDs. Product DetailTabs190–207 uses name/toast; ProductDrawer73 passes no product to FilesTab. ProductFormModal239–260 toolbar has no handlers; useProductForm106 trims plain text and overview DetailTabs55 renders plain text.

Next cohesive product pack requires typed private media associations, primary/order and guarded image bytes; extracted ProductMediaEditor/ProductDescriptionEditor plus safe structured/Markdown subset renderer, legacy plain-text compatibility and plain projection for AI/search/038b transfer. Use exact catalog handlers/read/repos/schema and product form/Drawer/types/API/mocks/i18n seams; no arbitrary HTML or public URL by default. Domain limits and lifecycle chosen explicitly under existing rights, no new default agent skills. File/image staging is not product association; no automatic AI analysis/publication.

Predecessors:023c file-access (not030b creator),023f input handles,030b immutable-source pattern,038b dataset transfer,015c privacy inventory/cleanup and045b/042c current rights. None alone covers new associations. Source policy/current send/read proof must be native, not mock-only.
