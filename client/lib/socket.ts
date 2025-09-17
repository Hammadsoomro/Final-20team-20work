import { io, type Socket } from "socket.io-client";

// If a real socket cannot be established (serverless environment), fall back to a REST-polling "socket".
// The REST fallback implements the minimal subset used by the app: on/off/emit/disconnect and emits
// presence:update and chat:message by polling the HTTP API endpoints.

type Handler = (...args: any[]) => void;

class RestSocket {
  userId: string;
  connected: boolean;
  private events: Map<string, Set<Handler>> = new Map();
  private presenceTimer: any = null;
  private teamTimer: any = null;
  private lastTeamTs = 0;

  constructor(userId: string) {
    this.userId = userId;
    this.connected = true;
    // Immediately send heartbeat and start polling
    this.emit("presence:heartbeat").catch(() => {});
    this.startPolling();
  }

  on(event: string, fn: Handler) {
    const s = this.events.get(event) || new Set();
    s.add(fn);
    this.events.set(event, s);
  }
  off(event: string, fn: Handler) {
    const s = this.events.get(event);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) this.events.delete(event);
  }

  async emit(event: string, payload?: any) {
    try {
      if (event === "presence:heartbeat") {
        await fetch(`/api/presence/heartbeat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: this.userId }),
        });
        return;
      }

      if (event === "chat:team:send") {
        const text = payload?.text || "";
        await fetch(`/api/chat/team/messages`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: this.userId, text }),
        });
        return;
      }

      if (event === "chat:dm:send") {
        const toUserId = payload?.toUserId || "";
        const text = payload?.text || "";
        if (!toUserId || !text) return;
        // Resolve room id
        const r = await fetch(`/api/chat/dm/${this.userId}/${toUserId}`, {
          credentials: "include",
        });
        if (!r.ok) return;
        const data = await r.json();
        const roomId = data?.roomId;
        if (!roomId) return;
        await fetch(`/api/chat/${encodeURIComponent(roomId)}/messages`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: this.userId, text }),
        });
        return;
      }

      if (event === "chat:join") {
        // no-op for REST fallback
        return;
      }
    } catch (e) {
      // ignore
    }
  }

  disconnect() {
    this.connected = false;
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.teamTimer) clearInterval(this.teamTimer);
    this.events.clear();
  }

  private emitEvent(event: string, ...args: any[]) {
    const s = this.events.get(event);
    if (!s) return;
    for (const fn of Array.from(s)) {
      try {
        fn(...args);
      } catch (e) {}
    }
  }

  private startPolling() {
    // Presence polling
    this.presenceTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/presence/online`, { credentials: "include" });
        if (!res.ok) return;
        const online = await res.json();
        this.emitEvent("presence:update", online);
      } catch {}
    }, 3000);

    // Team messages polling (fetch new messages)
    this.teamTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/team/messages?limit=200`, { credentials: "include" });
        if (!res.ok) return;
        const msgs = (await res.json()) as any[];
        if (!Array.isArray(msgs)) return;
        // emit messages with createdAt > lastTeamTs
        for (const m of msgs) {
          if (!m || typeof m.createdAt !== "number") continue;
          if (m.createdAt > this.lastTeamTs) {
            this.emitEvent("chat:message", m);
          }
        }
        if (msgs.length) this.lastTeamTs = msgs[msgs.length - 1].createdAt || this.lastTeamTs;
      } catch {}
    }, 2000);
  }
}

let socket: Socket | RestSocket | null = null;

export function getSocket(userId: string) {
  // If already connected, return
  if (socket && (socket as any).connected) return socket as any;

  // Clean up previous
  if (socket) {
    try {
      (socket as any).disconnect();
    } catch {}
    socket = null;
  }

  // Try to establish a real socket.io connection
  try {
    const s = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      query: { userId },
      autoConnect: true,
    }) as Socket;

    // set a short timeout to detect failure and fall back
    const t = setTimeout(() => {
      if (!s.connected) {
        try {
          s.disconnect();
        } catch {}
        // fallback to REST socket
        socket = new RestSocket(userId);
      }
    }, 1500);

    s.on("connect", () => {
      clearTimeout(t);
      socket = s;
    });

    s.on("connect_error", () => {
      try {
        s.disconnect();
      } catch {}
      socket = new RestSocket(userId);
    });

    socket = s;
    return socket as any;
  } catch (e) {
    // immediate fallback
    socket = new RestSocket(userId);
    return socket;
  }
}
