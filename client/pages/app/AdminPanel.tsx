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

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"scrapper" | "seller">("seller");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => setUsers(await getUsers()))();
  }, []);

  const refresh = async () => setUsers(await getUsers());

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
        <Button
          onClick={async () => {
            const current = JSON.parse(
              localStorage.getItem("current_user") || "null",
            );
            await adminCreateMember(current, { name, email, role, password });
            setName("");
            setEmail("");
            setPassword("");
            await refresh();
          }}
        >
          Add
        </Button>
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
                  onClick={async () => {
                    await adminToggleBlock(
                      JSON.parse(
                        localStorage.getItem("current_user") || "null",
                      ),
                      m.id,
                      !m.blocked,
                    );
                    await refresh();
                  }}
                >
                  {m.blocked ? "Unblock" : "Block"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await adminRemoveMember(
                      JSON.parse(
                        localStorage.getItem("current_user") || "null",
                      ),
                      m.id,
                    );
                    await refresh();
                  }}
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
