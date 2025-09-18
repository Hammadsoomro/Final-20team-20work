import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown } from "lucide-react";
import QuickActions from "@/components/QuickActions";
import { User, getUsers, login } from "@/lib/auth"; // Assuming login gives you current user



export default function DashboardHome() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    (async () => setUsers(await getUsers()))();
  }, []);

  const crown = useMemo(() => {
    const active = users.filter((u) => !u.blocked);
    if (!active.length) return null;
    return active.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b));
  }, [users]);
  const todaySales = useMemo(
    () => users.reduce((s, u) => s + (u.salesToday || 0), 0),
    [users],
  );
  const monthSales = useMemo(
    () => users.reduce((s, u) => s + (u.salesMonth || 0), 0),
    [users],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-emerald-500 text-white">
          <CardHeader>
            <CardTitle>Today Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{todaySales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
          <CardHeader>
            <CardTitle>Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{monthSales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{users.filter((u) => !u.blocked).length}</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 blur-2xl opacity-60" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="text-yellow-500" /> Top Salesman
            </CardTitle>
          </CardHeader>
          <CardContent>
            {crown ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{crown.name}</div>
                  <div className="text-sm text-muted-foreground">{crown.role.toUpperCase()}</div>
                </div>
                <div className="text-2xl font-bold">{(crown.salesMonth ?? 0).toLocaleString()}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">No salesman yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickActions />

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Team Members</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {users.map((u, i) => {
            const colors = [
              "from-indigo-500 to-pink-500",
              "from-amber-400 to-yellow-500",
              "from-cyan-400 to-blue-500",
              "from-emerald-400 to-green-500",
            ];
            const gradient = colors[i % colors.length];
            return (
              <div key={u.id} className={`rounded-lg p-4 text-white bg-gradient-to-br ${gradient}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{u.name}</div>
                    <div className="text-sm opacity-90">{u.role}</div>
                  </div>
                  <div className="text-2xl font-extrabold">{(u.salesMonth ?? 0).toLocaleString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
