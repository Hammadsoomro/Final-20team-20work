import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { User, addSales, getUsers } from "@/lib/auth";


function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-4 bg-white shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value.toLocaleString()}</div>
    </div>
  );
}

export default function Sales() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [todayDelta, setTodayDelta] = useState<number>(0);
  const categories = ["silver","gold","platinum","diamond","ruby","sapphire"];
  const [category, setCategory] = useState<string>(categories[0]);
  const [loading, setLoading] = useState(false);

  const canAdjust = currentUser?.role !== "salesman";

  useEffect(() => {
    if (currentUser) refresh();
  }, [currentUser]);

  async function refresh() {
    if (!currentUser) return;
    const list = await getUsers(currentUser);
    setUsers(list);
  }

  async function handleSaveEdit(targetId: string) {
    setLoading(true);
    try {
      await addSales(targetId, todayDelta, 0);
      // set category
      await fetch(`/api/users/${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesCategory: category }),
      });
      await refresh();
      setEditing(null);
      setTodayDelta(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetMonth() {
    if (!canAdjust || !currentUser) return;
    setLoading(true);
    try {
      await Promise.all(
        users.map((u) => {
          const m = u.salesMonth ?? 0;
          return m ? addSales(u.id, 0, -m) : Promise.resolve();
        })
      );
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  const list = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
    );
  }, [users, filter]);

  const totals = useMemo(() => {
    const today = users.reduce((s, u) => s + (u.salesToday ?? 0), 0);
    const month = users.reduce((s, u) => s + (u.salesMonth ?? 0), 0);
    const members = users.filter((u) => !u.blocked).length;
    return { today, month, members };
  }, [users]);

  const topSeller = useMemo(() => {
    const active = users.filter((u) => !u.blocked);
    if (!active.length) return null;
    return active.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b));
  }, [users]);

  return (


    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
              TR
            </div>
            <div>
              <h2 className="text-2xl font-bold">Sales Tracker</h2>
              <p className="text-sm text-muted-foreground">
                Track team sales performance by category
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Current Month:{" "}
            {new Date().toLocaleString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <Button onClick={refresh} variant="outline">
            Refresh
          </Button>
          <Button
            onClick={handleResetMonth}
            disabled={!canAdjust || loading}
            className="bg-orange-600 text-white"
          >
            Reset Month
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Today's Sales" value={totals.today} color="indigo" />
        <Metric label="Monthly Total" value={totals.month} color="green" />
        <Metric label="Team Members" value={totals.members} color="purple" />
        <div className="rounded-lg p-4 bg-white shadow-sm">
          <div className="text-xs text-muted-foreground">Top Salesman</div>
          <div className="mt-2 text-lg font-semibold">
            {/* show top seller name or none */}
            {(users.length &&
              (users.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b))
                .name as string)) ||
              "None"}
          </div>
          <div className="text-sm text-muted-foreground">
            {users.length
              ? `${users.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b)).salesMonth ?? 0} sales`
              : "0 sales"}
          </div>
        </div>
      </section>

      <section>
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search team"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-slate-50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Today's Sales</th>
                  <th className="px-4 py-3">Monthly Total</th>
                  <th className="px-4 py-3">Sales Categories</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {list.map((m) => (
                  <tr key={m.id} className={m.blocked ? "opacity-60" : ""}>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {m.name?.charAt(0) ?? "U"}
                        </div>
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-gray-100">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">{m.salesToday ?? 0}</td>
                    <td className="px-4 py-4 align-top">{m.salesMonth ?? 0}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="text-sm text-muted-foreground">
                        {m.salesCategory || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        {canAdjust && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(m.id);
                              setTodayDelta(0);
                              setCategory(categories[0]);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canAdjust && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await addSales(m.id, 50, 50);
                              await refresh();
                            }}
                          >
                            +50
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-xl rounded-t-lg bg-white shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Edit sales</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust today's or monthly totals for the user
                </p>
              </div>
              <div>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm">Add to Today (positive or negative)</label>
                <Input
                  type="number"
                  value={String(todayDelta)}
                  onChange={(e) => setTodayDelta(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm">Sales Category</label>
                <select className="w-full border rounded px-2 py-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleSaveEdit(editing)} disabled={loading}>
                  {loading ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
