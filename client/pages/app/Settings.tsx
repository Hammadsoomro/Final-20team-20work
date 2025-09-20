import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
  }, [user]);

  useEffect(() => {
    // try to read existing notifications setting from user object
    setNotifications((user as any)?.notificationsEnabled ?? true);
  }, [user]);

  async function save() {
    if (!user) return;
    setLoading(true);
    try {
      const payload: any = { name, notificationsEnabled: notifications };
      if (password) payload.password = password;
      const res = await fetch(`/api/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      // refresh auth user
      try {
        const r = await fetch('/api/auth/me', { credentials: 'include' });
        if (r.ok) {
          const d = await r.json();
          setUser(d);
        }
      } catch {}
      setPassword("");
      alert("Settings saved");
    } catch (e: any) {
      alert("Could not save settings: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="bg-white rounded-md border p-4 grid gap-3">
        <label className="text-sm">Full name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />

        <label className="text-sm">Password (leave blank to keep)</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <label className="text-sm">Notifications</label>
        <div className="flex items-center gap-2">
          <input id="notif" type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
          <label htmlFor="notif" className="text-sm text-muted-foreground">Enable chat notifications</label>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save settings"}</Button>
        </div>
      </div>
    </div>
  );
}
