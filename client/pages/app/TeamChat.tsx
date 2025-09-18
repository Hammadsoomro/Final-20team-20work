import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getUsers, User } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import {
  clearUnread,
  dmRoom as dmRoomKey,
  getUnread,
  incUnread,
  onUnreadChange,
} from "@/lib/chatState";
import { useEffect, useMemo, useRef, useState } from "react";

type Message = {
  roomId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export default function TeamChat() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<User[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [activeRoom, setActiveRoom] = useState<
    | { type: "team" }
    | { type: "dm"; userId: string; roomId: string }
    | { type: "room"; roomId: string; name?: string }
  >({ type: "team" });
  const activeRoomRef = useRef(activeRoom);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const audioRef = useRef<AudioContext | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [unreadTick, setUnreadTick] = useState(0);

  const socket = useMemo(() => (user ? getSocket(user.id) : null), [user?.id]);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    if (!user) return;
    (async () => setContacts(await getUsers()))();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    const onPresence = (ids: string[]) => setOnline(ids);
    const onMessage = async (msg: Message) => {
      // ensure we have sender info
      const known = contacts.find((c) => c.id === msg.senderId);
      if (!known) {
        try {
          const r = await fetch(
            `/api/users/${encodeURIComponent(msg.senderId)}`,
            { credentials: "include" },
          );
          if (r.ok) {
            const u = await r.json();
            setContacts((c) => [...c, u]);
          }
        } catch {}
      }

      const current = activeRoomRef.current;
      const isCurrent =
        (current.type === "team" && msg.roomId === "team") ||
        (current.type === "dm" && msg.roomId === current.roomId) ||
        (current.type === "room" && msg.roomId === current.roomId);

      if (isCurrent) {
        setMessages((m) => [...m, msg]);
        scrollToBottom();
      } else {
        incUnread(msg.roomId);
        setUnreadTick((t) => t + 1);
      }

      // Auto-join sorter room and start countdown for salesmen when an announce arrives
      if (msg.roomId === "sorter" && msg.senderId === "system") {
        try {
          const obj = JSON.parse(msg.text);
          if (obj && obj.type === "sorter:announce") {
            if (Date.now() - lastAnnounceRef.current > 3000) {
              lastAnnounceRef.current = Date.now();
              if (user?.role === "salesman") {
                socket.emit("chat:join", { roomId: "sorter" });
                setActiveRoom({ type: "room", roomId: "sorter", name: "Sorter" });
                requestNumbers();
              }
            }
          }
        } catch {}
      }

      playBeep();
    };

    socket.on("presence:update", onPresence);
    socket.on("chat:message", onMessage);

    const hb = setInterval(() => socket.emit("presence:heartbeat"), 10_000);
    socket.emit("presence:heartbeat");

    // join default team room
    socket.emit("chat:join", { roomId: "team" });

    return () => {
      clearInterval(hb);
      socket.off("presence:update", onPresence);
      socket.off("chat:message", onMessage);
    };
  }, [socket, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setMessages([]);
        const roomId =
          activeRoom.type === "team"
            ? "team"
            : activeRoom.type === "dm"
              ? activeRoom.roomId
              : activeRoom.roomId;
        const res = await fetch(
          `/api/chat/${encodeURIComponent(roomId)}/messages?limit=200`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("history");
        setMessages(await res.json());
      } catch {
        setMessages([]);
      }
      scrollToBottom();
    })();
  }, [activeRoom, user]);

  useEffect(() => {
    const off = onUnreadChange(() => setUnreadTick((t) => t + 1));
    return () => off();
  }, []);

  const filtered = contacts.filter(
    (u) =>
      u.id !== user?.id &&
      (u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())),
  );

  const totals = {
    total: contacts.length,
    online: contacts.filter((c) => online.includes(c.id)).length,
    pinned: 0,
  };

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
    });
  }

  async function selectTeam() {
    if (socket) socket.emit("chat:join", { roomId: "team" });
    clearUnread("team");
    setUnreadTick((t) => t + 1);
    setActiveRoom({ type: "team" });
  }

  async function selectDm(targetId: string) {
    if (!user) return;
    const r = await fetch(`/api/chat/dm/${user.id}/${targetId}`, {
      credentials: "include",
    });
    const data = (await r.json()) as { roomId: string };
    socket?.emit("chat:join", { roomId: data.roomId });
    clearUnread(data.roomId);
    setUnreadTick((t) => t + 1);
    setActiveRoom({ type: "dm", userId: targetId, roomId: data.roomId });
  }

  function playBeep() {
    try {
      const ctx = (audioRef.current ||= new AudioContext());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        o.disconnect();
        g.disconnect();
      }, 120);
    } catch {}
  }

  async function send() {
    if (!user || !input.trim()) return;
    if (activeRoom.type === "team") {
      socket?.emit("chat:team:send", { text: input.trim() });
    } else {
      socket?.emit("chat:dm:send", {
        toUserId: activeRoom.userId,
        text: input.trim(),
      });
    }
    setInput("");
    scrollToBottom();
  }

  const title =
    activeRoom.type === "team"
      ? "Team Chat"
      : contacts.find((c) => c.id === activeRoom.userId)?.name || "Chat";
  const subtitle =
    activeRoom.type === "team"
      ? "Everyone can see this conversation"
      : contacts.find((c) => c.id === activeRoom.userId)?.email || "";

  const sorterAnnounce = useMemo(() => {
    if (!(activeRoom.type === "room" && activeRoom.roomId === "sorter"))
      return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      try {
        const obj = JSON.parse(m.text);
        if (obj && obj.type === "sorter:announce") return obj as any;
      } catch {}
    }
    return null;
  }, [messages, activeRoom]);

  // Remove timer behaviour: immediately claim numbers on request
  const lastAnnounceRef = useRef<number>(0);

  async function requestNumbers() {
    if (!user) return;
    try {
      await fetch("/api/sorter/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch {}
  }

  return (
    <div className="flex h-full min-h-0 gap-4" style={{ marginLeft: "-4px" }}>
      {/* Left contacts panel */}
      <div className="w-64 shrink-0 rounded-lg border bg-white flex flex-col h-full">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600" />
            <div className="font-bold text-gray-900">Team-Work</div>
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Input
              placeholder="Search contacts..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m21 21-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </svg>
          </div>
        </div>

        <div className="border-b p-2">
          <Button
            className={`w-full justify-start relative ${activeRoom.type === 'team' ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'}`}
            onClick={selectTeam}
          >
            <div className={`mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full ${activeRoom.type === 'team' ? 'bg-white/60 text-indigo-700' : 'bg-white/20'}`}>
              <svg
                className={`${activeRoom.type === 'team' ? 'h-5 w-5 text-indigo-700' : 'h-5 w-5 text-white'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <div className={`font-medium ${activeRoom.type === 'team' ? 'text-indigo-900' : ''}`}>Team Chat</div>
              <div className="text-xs text-indigo-100">Everyone can see</div>
            </div>
            {getUnread("team") > 0 && (
              <span className="absolute right-3 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {getUnread("team")}
              </span>
            )}
          </Button>

          <Button
            className={`mt-2 w-full justify-start relative ${activeRoom.type === 'room' && activeRoom.roomId === 'sorter' ? 'bg-emerald-50 ring-2 ring-emerald-200' : 'border bg-white'}`}
            onClick={() => {
              if (socket) socket.emit("chat:join", { roomId: "sorter" });
              setActiveRoom({ type: "room", roomId: "sorter", name: "Sorter" });
              clearUnread("sorter");
            }}
          >
            <div className={`mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full ${activeRoom.type === 'room' && activeRoom.roomId === 'sorter' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
              S
            </div>
            <div className="text-left">
              <div className={`font-medium ${activeRoom.type === 'room' && activeRoom.roomId === 'sorter' ? 'text-emerald-800' : ''}`}>Sorter</div>
              <div className="text-xs text-gray-400">Auto distribution</div>
            </div>
            {getUnread("sorter") > 0 && (
              <span className="absolute right-3 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {getUnread("sorter")}
              </span>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              className={`w-full rounded-md p-2 text-left ${activeRoom.type === 'dm' && activeRoom.userId === c.id ? 'bg-indigo-50 ring-2 ring-indigo-200' : 'hover:bg-gray-50'}`}
              onClick={() => selectDm(c.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`relative h-10 w-10 rounded-full ${online.includes(c.id) ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"} inline-flex items-center justify-center`}
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span
                    className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full ${online.includes(c.id) ? "bg-emerald-500" : "bg-gray-300"} ring-2 ring-white`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className={`truncate font-medium ${activeRoom.type === 'dm' && activeRoom.userId === c.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {c.name}
                    </div>
                    <span className="text-[10px] uppercase text-gray-400">
                      {c.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="truncate text-xs text-gray-500">
                      {c.email}
                    </div>
                    {user && getUnread(dmRoomKey(user.id, c.id)) > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                        {getUnread(dmRoomKey(user.id, c.id))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t bg-gray-50 text-xs text-gray-600 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>Total Contacts: {totals.total}</div>
            <div>Online: {totals.online}</div>
            <div>Pinned: {totals.pinned}</div>
          </div>
        </div>
      </div>

      {/* Right chat panel */}
      <Card className="flex min-h-[60vh] flex-1 flex-col border bg-white">
        <div className={`flex items-center gap-3 border-b p-4 ${activeRoom.type === 'team' ? 'bg-indigo-50' : activeRoom.type === 'room' && activeRoom.roomId === 'sorter' ? 'bg-emerald-50' : ''}`}>
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${activeRoom.type === 'team' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{title}</div>
            <div className="text-sm text-gray-500">{subtitle}</div>
          </div>
        </div>
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 p-4"
        >
          {messages.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <svg
                className="mx-auto mb-4 h-12 w-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((m, i) => {
                const isMe = m.senderId === user?.id;
                const sender = contacts.find((c) => c.id === m.senderId);
                return (
                  <div key={i} className="">
                    {!isMe && (
                      <div className="mb-1 text-xs text-gray-500">
                        {sender ? sender.name : m.senderId}
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-md px-3 py-2 text-sm ${isMe ? 'ml-auto bg-indigo-600 text-white' : (m.roomId === 'sorter' && m.senderId === 'system') ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-gray-100 text-gray-900'}`}
                    >
                      <div>{m.text}</div>
                      <div className="mt-1 text-[10px] text-gray-400">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Button
              onClick={send}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
