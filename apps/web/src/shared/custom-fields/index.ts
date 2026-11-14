// Trường dữ liệu tuỳ biến dùng chung 6 màn có bảng (D56, standards/domain/custom-fields.md §4).
export { customFieldDefsQuery, customParams, useCustomFields } from './api';
export { CustomFieldInputs } from './CustomFieldInputs';
export { CustomFieldList, CustomFilterSelects, customFilterValue, pickCustomFilter, useCustomColumns, useCustomFilterFields } from './CustomFieldList';
export { customDiff, formatCustomValue, parseCustomInput } from './format';
export { useCustomDraft, type CustomDraft } from './useCustomDraft';
