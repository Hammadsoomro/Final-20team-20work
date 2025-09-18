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
  const { toast } = useToast();

  useEffect(() => {
    if (!current) return;
    (async () => setUsers(await getUsers(current)))();
  }, [current]);

  async function assign(member: User) {
    if (!current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sorter/assign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data?.error || "Failed" });
      } else {
        const n = (data?.values || []).length;
        toast({ title: "Assigned", description: `Assigned ${n} lines to ${member.name}` });
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
        <div className="text-sm text-muted-foreground">Assign 3 lines per click</div>
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
    </div>
  );
}
