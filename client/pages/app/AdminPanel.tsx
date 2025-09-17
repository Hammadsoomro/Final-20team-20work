import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  adminCreateMember,
  adminRemoveMember,
  adminToggleBlock,
  getUsers,
} from "@/lib/auth";
import { useAuth } from "@/context/AuthContext"; // Assuming you're using context

export default function AdminPanel() {
  const { user: currentUser } = useAuth(); // Get current user from context
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"scrapper" | "seller">("seller");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const team = await getUsers(currentUser);
      setUsers(team);
    })();
  }, [currentUser]);

  const refresh = async () => {
    if (!currentUser) return;
    const team = await getUsers(currentUser);
    setUsers(team);
  };

  const handleAdd = async () => {
    if (!currentUser) return;
    await adminCreateMember(currentUser, { name, email, role, password });
    setName("");
    setEmail("");
    setPassword("");
    await refresh();
  };

  const handleToggleBlock = async (id: string, blocked: boolean) => {
    if (!currentUser) return;
    await adminToggleBlock(id, blocked);
    await refresh();
  };

  const handleRemove = async (id: string) => {
    if (!currentUser) return;
    await adminRemoveMember(id);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Admin Controls</h2>
      <p className="text-muted-foreground">
        Create, remove, or block team accounts.
      </p>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select
          className="h-10 rounded-md border bg-background px-2"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="seller">Seller</option>
          <option value="scrapper">Scrapper</option>
        </select>
        <Button onClick={handleAdd}>Add</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="text-sm text-muted-foreground truncate">
                {m.email}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={m.blocked ? "secondary" : "destructive"}
                  onClick={() => handleToggleBlock(m.id, !m.blocked)}
                >
                  {m.blocked ? "Unblock" : "Block"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemove(m.id)}
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}