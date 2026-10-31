// Socket.IO namespace `/ws` ở chế độ http (Blueprint §4.6): một kết nối cho cả app, xác thực bằng access token + workspace của
// http-transport (đọc lại mỗi lần kết nối — token làm mới không cần nối lại; đổi workspace / đăng xuất thì nối lại). Chỉ websocket
// (không long-polling): WebSocket không bị CORS chặn nên dev / E2E nối thẳng API (`NEXT_PUBLIC_WS_URL`); production cùng origin
// qua nginx (`/socket.io`). Phòng hội thoại: `conv.join` / `conv.leave`, tự vào lại sau khi nối lại.
'use client';
import { io, type Socket } from 'socket.io-client';
import { onSessionChange, sessionAuth } from '../api/http-transport';

type Handler = (event: string, data: unknown) => void;

let socket: Socket | null = null;
let workspace: string | null = null;
const handlers = new Set<Handler>();
const convRooms = new Map<string, number>();

const url = () => `${process.env.NEXT_PUBLIC_WS_URL || ''}/ws`;

function connect(): void {
  const auth = sessionAuth();
  if (!auth.token || !auth.workspace_id) return;
  workspace = auth.workspace_id;
  const s = io(url(), {
    transports: ['websocket'],
    // Gọi lại mỗi lần (kể cả tự nối lại) → luôn dùng access token mới nhất.
    auth: (cb) => cb(sessionAuth()),
  });
  s.onAny((event: string, data: unknown) => {
    for (const h of handlers) h(event, data);
  });
  s.on('connect', () => {
    for (const id of convRooms.keys()) s.emit('conv.join', { conversation_id: id });
  });
  socket = s;
}

function disconnect(): void {
  socket?.disconnect();
  socket = null;
  workspace = null;
}

/** Nối lại khi đổi workspace / đăng xuất / vừa có token (lần đầu). */
function sync(): void {
  const auth = sessionAuth();
  if (!auth.token || !auth.workspace_id) return disconnect();
  if (socket && workspace === auth.workspace_id) return;
  disconnect();
  connect();
}

let started = false;
/** Bắt đầu nghe (gọi một lần trong AppShell ở chế độ http); trả hàm huỷ đăng ký handler. */
export function subscribeRealtime(h: Handler): () => void {
  handlers.add(h);
  if (!started) {
    started = true;
    onSessionChange(sync);
  }
  sync();
  return () => {
    handlers.delete(h);
    if (!handlers.size) {
      disconnect();
    }
  };
}

/** Vào phòng hội thoại đang mở (nhận `message.new` / `message.updated` / `typing`); đếm tham chiếu — rời khi không ai mở nữa. */
export function joinConversation(id: string): () => void {
  convRooms.set(id, (convRooms.get(id) ?? 0) + 1);
  if (socket?.connected) socket.emit('conv.join', { conversation_id: id });
  return () => {
    const n = (convRooms.get(id) ?? 1) - 1;
    if (n > 0) return void convRooms.set(id, n);
    convRooms.delete(id);
    if (socket?.connected) socket.emit('conv.leave', { conversation_id: id });
  };
}
