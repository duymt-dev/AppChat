// Màu Cơ hội / Sales Pipeline (TIP-026c — prototype thẻ 360° L2386, drawer L2852, `ppVals()` L9612, `dealStages()` L9226); trải vào `color`.
// Màu từng giai đoạn là dữ liệu (OPPORTUNITY_STAGE_COLOR ở @appchat/shared), ở đây chỉ các nền / chữ trạng thái + khung thêm nhanh.
export const pipelineColor = {
  oppOpenBg: '#E6F0FF',
  oppWonBg: '#D7F0E0',
  oppWonText: '#0E5A2E',
  oppLostText: '#7A271A',
  oppNextBg: '#F6F8F9',
  oppNextWarnBg: '#FFF7EA',
  oppAddLine: '#9CCFAF',
  oppAddBg: '#F7FCF9',
  oppPickLine: '#CFE6D8',
  oppNewBg: '#F3E8FF',
  oppNewText: '#6B21A8',
  oppLinkLine: '#DDF3E6',
  oppLinkBg: '#F7FDF9',
} as const;
