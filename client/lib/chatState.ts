type UnreadMap = Record<string, number>;

const EVT = "chat:unread-change";
let map: UnreadMap = {};

// initialize from server
(async function init() {
  try {
    const res = await fetch("/api/unread", { credentials: "include" });
    if (res.ok) {
      map = await res.json();
      window.dispatchEvent(new CustomEvent(EVT));
    }
  } catch {}
})();

export function dmRoom(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

export function getUnread(roomId: string): number {
  return map[roomId] || 0;
}
export function getTotalUnread(): number {
  return Object.values(map).reduce((s, n) => s + n, 0);
}
export async function incUnread(roomId: string) {
  try {
    await fetch("/api/unread/inc", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
  } catch {}
  map[roomId] = (map[roomId] || 0) + 1;
  window.dispatchEvent(new CustomEvent(EVT));
}
export async function clearUnread(roomId: string) {
  try {
    await fetch("/api/unread/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
  } catch {}
  if (map[roomId]) delete map[roomId];
  window.dispatchEvent(new CustomEvent(EVT));
}
export async function clearAll() {
  try {
    await fetch("/api/unread/clearAll", { method: "POST" });
  } catch {}
  map = {};
  window.dispatchEvent(new CustomEvent(EVT));
}
export function onUnreadChange(fn: () => void) {
  const handler = () => fn();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}
