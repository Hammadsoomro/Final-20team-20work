import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      fetchRecords();
      fetchNames();
    }
  }, [user]);

  async function fetchNames() {
    try {
      const ownerId = user?.ownerId || user?.id;
      const r = await fetch(
        `/api/users?ownerId=${encodeURIComponent(ownerId)}`,
        {
          credentials: "include",
        },
      );
      if (!r.ok) return;
      const list = await r.json();
      const map: Record<string, string> = {};
      for (const u of list) map[u.id] = u.name || u.email || u.id;
      setNames(map);
    } catch {}
  }

  async function fetchRecords() {
    try {
      setLoading(true);
      const ownerId = user?.ownerId || user?.id;
      const res = await fetch(
        `/api/attendance?ownerId=${encodeURIComponent(ownerId)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRecords(data);
    } catch (e) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function mark() {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      alert("Attendance recorded: " + data.recordedAt);
      if (user?.role === "admin") fetchRecords();
    } catch (e: any) {
      alert("Could not record attendance");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">Attendance</h2>
      <p className="text-muted-foreground">
        Clock in your attendance. Admins can view team attendance.
      </p>
      <div className="mt-4">
        <Button onClick={mark} disabled={!user}>
          Mark Attendance
        </Button>
      </div>
      {user?.role === "admin" && (
        <div className="mt-6">
          <h3 className="font-semibold">Recent Attendance</h3>
          {loading ? (
            <div>Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-sm text-muted-foreground mt-2">No records</div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const d = new Date(r.timestamp);
                    const date = d.toLocaleDateString();
                    const time = d.toLocaleTimeString();
                    return (
                      <tr key={r._id} className="border-t">
                        <td className="px-3 py-2">{date}</td>
                        <td className="px-3 py-2">{time}</td>
                        <td className="px-3 py-2">
                          {names[r.userId] || r.userId}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
