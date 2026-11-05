# Zalo cá nhân — ma trận năng lực nhà cung cấp (zca-js 2.2.0)

Nguồn: type và mã của gói đã cài, `node_modules/.pnpm/zca-js@2.2.0/node_modules/zca-js/dist` (đọc ngày 2026-11-05). Không nâng phiên bản SDK.
Một năng lực chỉ được bật khi đã map vào `zca-transport.ts`, có test trên transport giả với tham chiếu dạng thật, và có ghi ở đây. SDK có
hàm không phải là lý do để bật.

**Chưa nghiệm thu với tài khoản Zalo thật** (Q-003). Mục *Kiểm thật* của mọi dòng là CHỜ-TK cho tới khi chạy `zalo-live.test.ts`.

## Thao tác trên tin (TIP-014b A)

| Thao tác | Manifest | Hàm SDK | Tham số bắt buộc | Giới hạn đã biết | Kiểm thật |
|---|---|---|---|---|---|
| Thu hồi | `recall: remote` | `undo({ msgId, cliMsgId }, threadId, type)` | msgId + cliMsgId + thread + loại thread | Trả `{status}`. Lỗi rõ ném `ZaloApiError`. Tin nhiều phần phải thu hồi từng phần. | CHỜ-TK |
| Cảm xúc | `react: remote` | `addReaction(icon, { data: { msgId, cliMsgId }, threadId, type })` | như trên; icon là mã `Reactions` | `Reactions.NONE = ""` là gỡ. SDK `parseInt` msgId/cliMsgId, nên id > `MAX_SAFE_INTEGER` bị cách ly (`unsafe_ref`). Một tài khoản chỉ có một cảm xúc trên mỗi tin. | CHỜ-TK |
| Đọc nhóm | `group_info: remote` | `getGroupInfo(groupId)` → `gridInfoMap[groupId]` | id nhóm | `memberIds` có thể thiếu so với `totalMember`, khi đó đánh dấu `complete=false` | CHỜ-TK |
| Thành viên nhóm | `group_members: remote` | `getGroupMembersInfo(memberIds)` | **id thành viên** (lấy từ getGroupInfo), không nhận id nhóm | Trả `profiles` theo id | CHỜ-TK |
| Link nhóm | `group_link: remote` | `getGroupLinkDetail(groupId)` | id nhóm | Có thể đang tắt hoặc không có link (`enabled: 0`). Bật link là thao tác riêng, không làm ở đây. Link nhạy cảm: không log, không đưa vào prompt. | CHỜ-TK |
| Thêm thành viên | `group_add_members: remote` | `addUserToGroup(memberIds, groupId)` | id đã biết (≤ 50) | Có thể thành công một phần (`errorMembers` + `error_data`), báo theo từng người | CHỜ-TK |

Tham chiếu tin:
- `sendMessage` chỉ trả `msgId` (`message.msgId`, `attachment[].msgId`), không có `cliMsgId`.
- Transport bật `selfListen: true` để lấy `cliMsgId`: tin tự gửi đi tới `onSelfMessage` (không vào pipeline tin khách). Core ghép theo đúng (tài khoản, msgId). Self-event tới trước biên nhận gửi thì giữ chờ 10 phút.
- Tin cũ hoặc không có self-event thì `cli_msg_id` null. Thao tác báo `provider_ref_missing` / `pending_ref`, không đoán.
- Tin vào: `TMessage.cliMsgId` có trong payload, lưu luôn.

## Sự kiện listener đã dùng

| Sự kiện | Payload (2.2.0) | Dùng cho |
|---|---|---|
| `message` (`isSelf=false`) | `UserMessage` / `GroupMessage` (`data.msgId`, `data.cliMsgId`, `uidFrom`, `ts`) | Tin vào (pipeline) + tham chiếu |
| `message` (`isSelf=true`, cần `selfListen`) | như trên, `uidFrom = "0"` | Lấy cliMsgId của tin tự gửi |
| `undo` | `Undo.data.content.globalMsgId` (số, msgId của tin gốc), `isSelf`, `isGroup` | Thu hồi từ kênh (khách / điện thoại) |
| `reaction` | `Reaction.data.content.rMsg[].gMsgID`, `rIcon` | Cảm xúc từ kênh. Mã ngoài 6 emoji AppChat thì bỏ qua. |
| `old_messages` | `Message[]`, `ThreadType` | Lịch sử (pha C) |
| `delivered_messages`, `seen_messages` | `DeliveredMessage` / `SeenMessage` (msgId, seenUids…) | Biên nhận (pha B), chưa bật |

## Không hỗ trợ / chưa bật

- Bật/tắt link nhóm (`enableGroupLink` / `disableGroupLink`), đổi tên nhóm, tắt thông báo: thuộc TIP-025b, qua facade thao tác này.
- Lịch sử chat nhóm qua `getGroupChatHistory`: public API không có con trỏ. `requestOldMessages(type, lastMsgId?)` của listener chỉ trả một trang, nên báo phạm vi quan sát được (pha C).
- Kết bạn / tìm người (`sendFriendRequest`, `findUser`…): pha E, theo quyết định của Chủ nhà (2026-11-05).
- Mọi hàm SDK khác (catalog, auto-reply, nhãn, ghi chú, bình chọn, đổi hồ sơ…): không bật, vì trùng tính năng AppChat hoặc ngoài phạm vi.
