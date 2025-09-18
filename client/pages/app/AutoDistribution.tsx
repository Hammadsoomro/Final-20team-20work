import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";

export default function AutoDistribution() {
  const { user } = useAuth();
  const canUse = user?.role === "admin" || user?.role === "scrapper";
  const socket = useMemo(() => (user ? getSocket(user.id) : null), [user?.id]);

  const [pending, setPending] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [onlineIds, setOnlineIds] = useState<string[]>([]);

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

  // Distribute controls removed per request: use server endpoints directly from admin pages

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
              <h2 className="text-2xl font-bold text-gray-900">
                Auto Distribution
              </h2>
              <p className="text-gray-600">
                Numbers added from Sorter queue and ready to distribute
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              Total queued: {pending.length}
            </div>
            <Button variant="secondary" onClick={refreshQueue}>
              Refresh
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm('Clear queued numbers? This will remove all pending items.')) return;
                try {
                  await fetch('/api/sorter/clear', { method: 'POST' });
                } catch {}
                await refreshQueue();
              }}
            >
              Clear Queue
            </Button>
          </div>
        </div>
      </div>


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
            <span className="ml-3 font-medium text-gray-900">
              Queued Numbers
            </span>
          </div>
          <div className="text-sm text-gray-700">
            {loading ? "Loading..." : `${pending.length} total`}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {pending.length ? (
            <div className="overflow-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="w-12 py-2">#</th>
                    <th className="py-2">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((v, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 text-right text-xs text-gray-500 font-mono pr-4">{i + 1}</td>
                      <td className="py-2 break-words font-mono text-gray-800">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="italic text-gray-500">
              Numbers you add from Sorter → Add to Queue will appear here and accumulate.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
