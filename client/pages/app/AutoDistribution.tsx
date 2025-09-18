import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AutoDistribution() {
  const { user } = useAuth();
  const canUse = user?.role === "admin" || user?.role === "scrapper";
  const socket = useMemo(() => (user ? getSocket(user.id) : null), [user?.id]);

  const [pending, setPending] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [perUser, setPerUser] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [selectionMode, setSelectionMode] = useState<"all" | "selected">(
    "all",
  );
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [salesmen, setSalesmen] = useState<
    { id: string; name: string; email?: string }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("autoDist.settings");
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.perUser === "number") setPerUser(s.perUser);
        if (typeof s.timerSeconds === "number") setTimerSeconds(s.timerSeconds);
        if (s.selectionMode === "all" || s.selectionMode === "selected")
          setSelectionMode(s.selectionMode);
        if (Array.isArray(s.selectedIds)) setSelectedIds(s.selectedIds);
      }
    } catch {}
  }, []);

  // Persist settings whenever they change
  useEffect(() => {
    try {
      const payload = {
        perUser,
        timerSeconds,
        selectionMode,
        selectedIds,
      };
      localStorage.setItem("autoDist.settings", JSON.stringify(payload));
    } catch {}
  }, [perUser, timerSeconds, selectionMode, selectedIds]);

  async function refreshQueue() {
    setLoading(true);
    try {
      const r = await fetch("/api/sorter");
      const data = await r.json();
      setPending((data?.pending as string[]) || []);
    } finally {
      setLoading(false);
    }
  }

  async function refreshPeople() {
    try {
      const r = await fetch("/api/presence/online", { credentials: "include" });
      const ids = (await r.json()) as string[];
      setOnlineIds(ids);
      const ru = await fetch("/api/users", { credentials: "include" });
      const allUsers = (await ru.json()) as any[];
      const list = allUsers
        .filter((u) => u.role === "salesman")
        .map((u) => ({ id: u.id as string, name: u.name as string, email: u.email as string }))
        .filter((u) => ids.includes(u.id));
      setSalesmen(list);
    } catch {}
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshQueue();
        await refreshPeople();
      } finally {
      }
    })();
    const t = setInterval(() => refreshPeople(), 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (list: string[]) => setPending(list);
    socket.on("sorter:update", onUpdate);
    try {
      socket.emit("chat:join", { roomId: "sorter" });
    } catch {}
    return () => {
      socket.off("sorter:update", onUpdate);
    };
  }, [socket]);

  async function distributeNow() {
    const body: any = {
      perUser,
      target: "online",
      timerSeconds,
    };
    if (selectionMode === "selected" && selectedIds.length) {
      body.selectedIds = selectedIds;
    }
    await fetch("/api/sorter/distribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (!canUse)
    return <div className="text-sm text-muted-foreground">Access denied</div>;

  return (
    <div className="max-w-[1280px] h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
            </div>
            <div className="ml-3">
              <h2 className="text-2xl font-bold text-gray-900">Auto Distribution</h2>
              <p className="text-gray-600">Numbers added from Sorter queue and ready to distribute</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              Total queued: {pending.length}
            </div>
            <Button variant="secondary" onClick={refreshQueue}>Refresh</Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card className="mb-4 border p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">Per user</span>
            <select
              className="ml-2 h-8 rounded border px-2"
              value={perUser}
              onChange={(e) => setPerUser(Number(e.target.value))}
            >
              {[1, 3, 5, 7, 11, 13, 15].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center min-w-[260px]">
            <span className="text-sm font-medium text-gray-700 mr-3">
              Timer: {timerSeconds}s
            </span>
            <div className="w-56">
              <Slider
                min={30}
                max={300}
                step={30}
                value={[timerSeconds]}
                onValueChange={(v) => setTimerSeconds(v[0] || 30)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Recipients</label>
            <div className="flex items-center gap-2">
              <button
                className={`h-8 rounded border px-3 text-sm ${selectionMode === "all" ? "bg-gray-900 text-white" : "bg-white"}`}
                onClick={() => setSelectionMode("all")}
              >
                All online ({onlineIds.length})
              </button>
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className={`h-8 rounded border px-3 text-sm ${selectionMode === "selected" ? "bg-gray-900 text-white" : "bg-white"}`}
                    onClick={() => setSelectionMode("selected")}
                  >
                    Select...
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select online salesmen</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[300px] overflow-auto space-y-2">
                    {salesmen.length === 0 ? (
                      <div className="text-sm text-gray-500">No online salesmen</div>
                    ) : (
                      salesmen.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedIds.includes(u.id)}
                            onCheckedChange={(v) => {
                              setSelectedIds((prev) =>
                                v ? [...new Set([...prev, u.id])] : prev.filter((x) => x !== u.id),
                              );
                            }}
                          />
                          <span>{u.name}</span>
                          <span className="ml-auto text-xs text-gray-400">{u.email}</span>
                        </label>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="ml-auto">
            <Button onClick={distributeNow} className="bg-indigo-600 text-white">
              Announce & Prepare
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex h-[480px] flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect width="16" height="20" x="4" y="2" rx="2" />
              <line x1="8" x2="16" y1="6" y2="6" />
              <line x1="16" x2="16" y1="14" y2="18" />
              <path d="M16 10h.01" />
              <path d="M12 10h.01" />
              <path d="M8 10h.01" />
              <path d="M12 14h.01" />
              <path d="M8 14h.01" />
              <path d="M12 18h.01" />
              <path d="M8 18h.01" />
            </svg>
            <span className="ml-3 font-medium text-gray-900">Queued Numbers</span>
          </div>
          <div className="text-sm text-gray-700">
            {loading ? "Loading..." : `${pending.length} total`}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="flex">
            <div className="w-12 border-r bg-gray-50 p-2 text-right text-xs text-gray-500 font-mono">
              {pending.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <div className="flex-1 p-4 text-sm font-mono">
              {pending.length ? (
                pending.map((v, i) => (
                  <div key={i} className="text-gray-800">
                    {v}
                  </div>
                ))
              ) : (
                <p className="italic text-gray-500">Numbers you add from Sorter → Add to Queue will appear here and accumulate.</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
