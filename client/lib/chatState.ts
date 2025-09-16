type UnreadMap = Record<string, number>;

const KEY = "chat_unread_map";
const EVT = "chat:unread-change";

function load(): UnreadMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UnreadMap) : {};
  } catch {
    return {};
  }
}
function save(map: UnreadMap) {
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function dmRoom(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

export function getUnread(roomId: string): number {
  const map = load();
  return map[roomId] || 0;
}
export function getTotalUnread(): number {
  const map = load();
  return Object.values(map).reduce((s, n) => s + n, 0);
}
export function incUnread(roomId: string) {
  const map = load();
  map[roomId] = (map[roomId] || 0) + 1;
  save(map);
}
export function clearUnread(roomId: string) {
  const map = load();
  if (map[roomId]) {
    delete map[roomId];
    save(map);
  }
}
export function clearAll() {
  save({});
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
