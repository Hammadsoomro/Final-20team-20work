import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, addSales, getUsers } from "@/lib/auth";

function Metric({ label, value, color, onAdd }: { label: string; value: number; color: string; onAdd?: () => void }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-end justify-between">
        <div className={`bg-gradient-to-br ${color} bg-clip-text text-transparent text-2xl font-extrabold`}>{value.toLocaleString()}</div>
        {onAdd && (
          <Button size="icon" variant="ghost" onClick={onAdd}>
            +
          </Button>
        )}
      </div>
    </div>
  );
}

import { useAuth } from "@/context/AuthContext";

export default function Sales() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    (async () => setUsers(await getUsers()))();
  }, []);

  const refresh = async () => setUsers(await getUsers());

  const list = users.filter(
    (u) => u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()),
  );

  const canAdjust = true; // Layout guards roles for visibility; server will validate

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input placeholder="Search team" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((m) => (
          <Card key={m.id} className={m.blocked ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{m.name}</span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-secondary">{m.role}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground truncate">{m.email}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Metric
                  label="Today"
                  value={m.salesToday ?? 0}
                  color="from-indigo-500 to-emerald-500"
                  onAdd={
                    canAdjust
                      ? async () => {
                          await addSales(m.id, 50, 0);
                          await refresh();
                        }
                      : undefined
                  }
                />
                <Metric
                  label="Month"
                  value={m.salesMonth ?? 0}
                  color="from-cyan-400 to-blue-500"
                  onAdd={
                    canAdjust
                      ? async () => {
                          await addSales(m.id, 0, 250);
                          await refresh();
                        }
                      : undefined
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
