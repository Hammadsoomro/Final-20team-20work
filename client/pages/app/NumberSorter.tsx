import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";

function parseNumberLike(s: string): number | null {
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function NumberSorter() {
  const { user } = useAuth();
  const [raw, setRaw] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [perUser, setPerUser] = useState(3);
  const [target, setTarget] = useState<"online" | "all">("online");
  const [intervalMin, setIntervalMin] = useState(3);
  const [auto, setAuto] = useState(false);
  const timerRef = useRef<number | null>(null);
  const socket = useMemo(() => (user ? getSocket(user.id) : null), [user?.id]);

  const canUse = user?.role === "admin" || user?.role === "scrapper";
  if (!canUse)
    return <div className="text-sm text-muted-foreground">Access denied</div>;

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/sorter");
      if (r.ok) {
        const data = await r.json();
        setPending(data.pending as string[]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (list: string[]) => setPending(list);
    socket.on("sorter:update", onUpdate);
    return () => {
      socket.off("sorter:update", onUpdate);
    };
  }, [socket]);

  const stats = useMemo(() => {
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const uniq = Array.from(new Set(lines));
    const sorted = [...uniq].sort((a, b) => {
      const na = parseNumberLike(a);
      const nb = parseNumberLike(b);
      if (na !== null && nb !== null) return na - nb;
      return a.localeCompare(b);
    });
    return {
      raw: lines.length,
      unique: uniq.length,
      dup: Math.max(lines.length - uniq.length, 0),
      lines,
      uniq,
      sorted,
    };
  }, [raw]);

  async function addToQueue() {
    if (!stats.sorted.length) return;
    await fetch("/api/sorter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: stats.sorted }),
    });
    setRaw("");
  }

  async function tickDistribute() {
    await fetch("/api/sorter/distribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perUser, target }),
    });
  }

  useEffect(() => {
    if (!auto) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    tickDistribute();
    timerRef.current = window.setInterval(
      tickDistribute,
      intervalMin * 60 * 1000,
    ) as any;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [auto, perUser, target, intervalMin]);

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
            </div>
            <div className="ml-3">
              <h2 className="text-2xl font-bold text-gray-900">
                Number Sorter
              </h2>
              <p className="text-gray-600">
                Auto-sort, remove duplicates & distribute numbers
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">
              Auto Distributor
            </span>
            <Button
              className={`ml-2 ${auto ? "bg-emerald-600" : "bg-emerald-600"}`}
              onClick={() => setAuto((v) => !v)}
            >
              <svg
                className="h-4 w-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v10" />
                <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
              </svg>
              <span className="ml-2 text-white font-medium">
                {auto ? "ON" : "OFF"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6 border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center text-gray-700">
              <svg
                className="h-4 w-4 text-gray-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="4" x2="20" y1="9" y2="9" />
                <line x1="4" x2="20" y1="15" y2="15" />
                <line x1="10" x2="8" y1="3" y2="21" />
                <line x1="16" x2="14" y1="3" y2="21" />
              </svg>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Lines/User:
              </span>
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
            <div className="ml-6 flex items-center">
              <svg
                className="h-4 w-4 text-gray-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <path d="M16 3.128a4 4 0 0 1 0 7.744" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Target:
              </span>
              <select
                className="ml-2 h-8 rounded border px-2"
                value={target}
                onChange={(e) => setTarget(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="ml-6 flex items-center">
              <svg
                className="h-4 w-4 text-gray-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="10" x2="14" y1="2" y2="2" />
                <line x1="12" x2="15" y1="14" y2="11" />
                <circle cx="12" cy="14" r="8" />
              </svg>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Interval:
              </span>
              <select
                className="ml-2 h-8 rounded border px-2"
                value={intervalMin}
                onChange={(e) => setIntervalMin(Number(e.target.value))}
              >
                {[1, 3, 5, 7, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}m
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <div className="rounded-md bg-gray-100 px-2 py-1 font-medium">
              {auto ? "Active" : "Inactive"}
            </div>
            <span className="ml-3">Ready: {pending.length} numbers</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6" style={{ height: "502.75px" }}>
        <div className="col-span-1">
          <Card className="flex h-full flex-col">
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
                <span className="ml-3 font-medium text-gray-900">
                  Number Input
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <span>Raw Lines: {stats.raw}</span>
                <span className="ml-4">Unique: {stats.unique}</span>
                <span className="ml-4">Duplicates: {stats.dup}</span>
              </div>
            </div>
            <div className="flex flex-1">
              <div className="flex flex-1 flex-col border-r">
                <div className="border-b bg-gray-50 p-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Raw Input
                  </h4>
                </div>
                <Textarea
                  placeholder="Enter numbers here, one per line..."
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="h-full flex-1 font-mono"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="border-b bg-emerald-50 p-3">
                  <h4 className="text-sm font-medium text-emerald-700">
                    Sorted & Deduplicated
                  </h4>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="flex">
                    <div className="w-12 border-r bg-gray-50 p-2 text-right text-xs text-gray-500 font-mono">
                      {stats.sorted.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <div className="flex-1 p-4 text-sm font-mono">
                      {stats.sorted.length ? (
                        stats.sorted.map((v, i) => (
                          <div key={i} className="text-gray-800">
                            {v}
                          </div>
                        ))
                      ) : (
                        <p className="italic text-gray-500">
                          Sorted numbers will appear here...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t bg-gray-50 p-4">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  Auto-distribution {auto ? "enabled" : "disabled"} • Next send:{" "}
                  {auto ? `${intervalMin}m` : "Manual only"}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={addToQueue}>
                    Add to Queue
                  </Button>
                  <Button
                    onClick={tickDistribute}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  >
                    Send Now
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
