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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/sorter");
        if (!r.ok) throw new Error("Failed to load queue");
        const data = await r.json();
        if (mounted) setPending((data?.pending as string[]) || []);
      } catch {
        if (mounted) setPending([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
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
            <Button
              variant="secondary"
              onClick={async () => {
                setLoading(true);
                try {
                  const r = await fetch("/api/sorter");
                  const data = await r.json();
                  setPending((data?.pending as string[]) || []);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card className="flex h-[540px] flex-col">
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
