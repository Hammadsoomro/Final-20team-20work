import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") fetchRecords();
  }, [user]);

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
          ) : (
            <div className="grid gap-2 mt-2">
              {records.map((r) => (
                <div key={r._id} className="rounded-md border p-2">
                  <div className="text-sm">User: {r.userId}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
