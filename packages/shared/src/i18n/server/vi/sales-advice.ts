// Câu tồn kho / giá / thay thế gửi khách do server dựng (TIP-022c §3.5): số tồn, giá, thời điểm kiểm luôn lấy từ quan sát hiện tại, không từ
// chữ của model. "Còn hàng" chỉ là tại thời điểm kiểm — không giữ hàng, không hứa ngày giao. Gộp vào `sales.advice`.
export const salesAdvice = {
  available: '{name}: còn hàng cho {qty} {unit} (kiểm lúc {time}) — giá {price}/{unit}. Hàng chưa được giữ cho mình ạ.',
  shortage: '{name}: hiện chưa đủ {qty} {unit} (kiểm lúc {time}).',
  shortageCombo: '{name}: một số thành phần hiện chưa đủ cho {qty} {unit} (kiểm lúc {time}).',
  unknown: '{name}: em chưa kiểm được tồn kho lúc này, em sẽ nhờ nhân viên xác nhận lại ạ.',
  notTracked: '{name} là {type}, không tính theo tồn kho — giá {price}/{unit}. Lịch / thời gian thực hiện cần xác nhận riêng ạ.',
  alternativesHead: 'Mình có thể tham khảo:',
  alternative: '- {name} — giá {price}/{unit}, còn hàng (kiểm lúc {time})',
  noAlternative: 'Em chưa tìm được sản phẩm thay thế đã kiểm còn hàng — mình cho em biết thêm nhu cầu để em tìm giúp nhé.',
  types: { service: 'dịch vụ', package: 'liệu trình', digital: 'sản phẩm số', rental: 'dịch vụ cho thuê', combo: 'combo' },
} as const;
