// Luật realtime sự kiện run đã commit (TIP-019b §5.3, DC-380): outbox `run.step` / `run.done` → WS cùng tên tới phòng `ws:{id}`, mỗi
// người nhận qua `require.run` (bộ lọc tra lại quyền đọc run hiện tại — runScope theo người khởi tạo gốc). Payload chỉ là tín hiệu làm
// mới (id run, gốc, seq, trạng thái thật, idx bước) — FE đọc lại chi tiết qua `GET /v1/runs/:id`.
import { runDoneEvent, runStepEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

for (const topic of ['run.step', 'run.done'] as const) {
  registerRealtimeRule(topic, topic, (e) => {
    const p = (topic === 'run.done' ? runDoneEvent : runStepEvent).parse(e.payload);
    const data = { run_id: p.run_id, root_run_id: p.root_run_id, seq: p.seq, status: p.status, ...(p.step_idx != null ? { step_idx: p.step_idx } : {}) };
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: topic, data, require: { permission: 'assistant.use', run: { runId: p.run_id } } }];
  });
}
