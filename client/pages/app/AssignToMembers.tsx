import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getUsers, User } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AssignToMembers() {
  const { user: current } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number>(3);
  const [recent, setRecent] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!current) return;
    (async () => {
      setUsers(await getUsers(current));
      await refreshRecent();
    })();
  }, [current]);

  async function refreshRecent() {
    try {
      const r = await fetch('/api/sorter/recent');
      if (!r.ok) return;
      const d = await r.json();
      setRecent(d.recent || []);
    } catch {}
  }

  async function assign(member: User) {
    if (!current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sorter/assign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "Failed" });
      } else {
        const n = (data?.values || []).length;
        toast({ title: "Assigned", description: `Assigned ${n} lines to ${member.name}` });
        await refreshRecent();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Assign Numbers to Members</h2>
        <div className="text-sm text-muted-foreground">Assign <input className="w-16 p-1 border rounded ml-2" type="number" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value || 1)))} /> lines per click</div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {users.map((m) => (
          <Card key={m.id} className={m.blocked ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{m.name}</span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-secondary">
                  {m.role}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground truncate">{m.email}</div>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" onClick={() => assign(m)} disabled={loading}>
                  Assign 3
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Recent Assignments</h3>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent assignments</div>
          ) : (
            recent.map((r, i) => (
              <div key={i} className="rounded-md border bg-white p-3">
                <div className="text-sm font-medium">{r.userId}</div>
                <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                <div className="mt-2 font-mono text-sm whitespace-pre-wrap">{(r.values || []).slice(0,5).join('\n')}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
