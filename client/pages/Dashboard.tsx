import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Crown,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings as SettingsIcon,
  Shield,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  addSales,
  adminCreateMember,
  adminRemoveMember,
  adminToggleBlock,
  getUsers,
  logout,
  topSeller,
} from "@/lib/auth";

export default function Dashboard() {
  const { user, logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<
    "dashboard" | "team-chat" | "number-sorter" | "sales" | "admin" | "settings"
  >("dashboard");
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    (async () => {
      const list = await getUsers();
      setUsers(list);
    })();
  }, [user, navigate]);

  const crown = useMemo(() => {
    const active = users.filter((u) => !u.blocked);
    if (!active.length) return null;
    return active.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b));
  }, [users]);
  const todaySales = useMemo(() => users.reduce((s, u) => s + (u.salesToday || 0), 0), [users]);
  const monthSales = useMemo(
    () => users.reduce((s, u) => s + (u.salesMonth || 0), 0),
    [users],
  );

  const refresh = async () => {
    const list = await getUsers();
    setUsers(list);
  };
  const canUseSorter = user?.role === "admin" || user?.role === "scrapper";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="size-6 rounded-md bg-gradient-to-br from-indigo-500 to-emerald-400" />
            <div className="font-extrabold tracking-tight">Team-Work</div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={active === "dashboard"} onClick={() => setActive("dashboard")}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={active === "team-chat"} onClick={() => setActive("team-chat")}>
                    <MessageCircle />
                    <span>Team Chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {canUseSorter && (
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={active === "number-sorter"} onClick={() => setActive("number-sorter")}>
                      <SortAsc />
                      <span>Number Sorter</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={active === "sales"} onClick={() => setActive("sales")}>
                    <BarChart3 />
                    <span>Sales Tracker</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user?.role === "admin" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive={active === "admin"} onClick={() => setActive("admin")}>
                      <Shield />
                      <span>Admin Panel</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={active === "settings"} onClick={() => setActive("settings")}>
                    <SettingsIcon />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => { logout(); authLogout(); navigate("/"); }}>
                    <LogOut />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="sticky top-0 z-10 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">{user ? `Signed in as ${user.name}` : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Home</Button>
              <Button variant="destructive" size="sm" onClick={() => { logout(); authLogout(); navigate("/"); }}>
                <LogOut className="mr-1" /> Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="container py-6">
          {active === "dashboard" && (
            <Overview users={users} todaySales={todaySales} monthSales={monthSales} crown={crown} />)
          }
          {active === "team-chat" && <TeamChat />}
          {active === "number-sorter" && canUseSorter && <NumberSorter />}
          {active === "sales" && (
            <SalesTracker users={users} onChange={refresh} canAdjust={user?.role !== "seller"} />
          )}
          {active === "admin" && user?.role === "admin" && <AdminPanel onChange={refresh} />}
          {active === "settings" && <Settings />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Overview({ users, todaySales, monthSales, crown }: { users: User[]; todaySales: number; monthSales: number; crown: User | null }) {
  return (
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
          <CardTitle className="flex items-center gap-2"><Crown className="text-yellow-500" /> Top Seller</CardTitle>
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
            <div className="text-muted-foreground">No seller yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SalesTracker({ users, onChange, canAdjust }: { users: User[]; onChange: () => void; canAdjust?: boolean }) {
  const [filter, setFilter] = useState("");
  const list = users.filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()));
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
                <Metric label="Today" value={m.salesToday ?? 0} color="from-indigo-500 to-emerald-500" onAdd={canAdjust ? () => { addSales(m.id, 50, 0); onChange(); } : undefined} />
                <Metric label="Month" value={m.salesMonth ?? 0} color="from-cyan-400 to-blue-500" onAdd={canAdjust ? () => { addSales(m.id, 0, 250); onChange(); } : undefined} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, color, onAdd }: { label: string; value: number; color: string; onAdd?: () => void }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-end justify-between">
        <div className={`bg-gradient-to-br ${color} bg-clip-text text-transparent text-2xl font-extrabold`}>{value.toLocaleString()}</div>
        {onAdd && (
          <Button size="icon" variant="ghost" onClick={onAdd}>+
          </Button>
        )}
      </div>
    </div>
  );
}

function AdminPanel({ onChange }: { onChange: () => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Admin Controls</h2>
      <p className="text-muted-foreground">Create, remove, or block team accounts.</p>
      <TeamList users={getUsers()} onChange={onChange} canManage />
    </div>
  );
}

function TeamList({ users, onChange, canManage }: { users: User[]; onChange: () => void; canManage?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"scrapper" | "seller">("seller");
  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="h-10 rounded-md border bg-background px-2" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="seller">Seller</option>
            <option value="scrapper">Scrapper</option>
          </select>
          <Button onClick={() => {
            const current = JSON.parse(localStorage.getItem("current_user")||"null");
            adminCreateMember(current, { name, email, role });
            setName(""); setEmail("");
            onChange();
          }}>Add</Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((m) => (
          <Card key={m.id} className={m.blocked ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{m.name}</span>
                <span className="text-xs rounded-full px-2 py-0.5 bg-secondary">{m.role}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground truncate">{m.email}</div>
              {canManage && (
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" variant={m.blocked ? "secondary" : "destructive"} onClick={() => { adminToggleBlock(JSON.parse(localStorage.getItem("current_user")||"null"), m.id, !m.blocked); onChange(); }}>
                    {m.blocked ? "Unblock" : "Block"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { adminRemoveMember(JSON.parse(localStorage.getItem("current_user")||"null"), m.id); onChange(); }}>Remove</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TeamChat() {
  const [messages, setMessages] = useState<string[]>(() => {
    const raw = localStorage.getItem("team_chat");
    return raw ? (JSON.parse(raw) as string[]) : ["Welcome to Team Chat!"];
  });
  const [input, setInput] = useState("");
  const { user } = useAuth();
  const send = () => {
    if (!input.trim()) return;
    const next = [...messages, `${user?.name ?? "User"}: ${input.trim()}`];
    setMessages(next);
    localStorage.setItem("team_chat", JSON.stringify(next));
    setInput("");
  };
  return (
    <div className="grid h-[60vh] grid-rows-[1fr_auto] rounded-lg border overflow-hidden">
      <div className="space-y-2 p-4 overflow-y-auto bg-gradient-to-b from-background to-background/60">
        {messages.map((m, i) => (
          <div key={i} className="rounded-md bg-secondary/50 px-3 py-2 text-sm">{m}</div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t p-3">
        <Input placeholder="Type message" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <Button onClick={send}><MessageCircle className="mr-1" /> Send</Button>
      </div>
    </div>
  );
}

function NumberSorter() {
  const [raw, setRaw] = useState("");
  const nums = raw
    .split(/\s|,|\n|\r|\t/g)
    .map((n) => Number(n))
    .filter((n) => !Number.isNaN(n));
  const sorted = [...nums].sort((a, b) => a - b);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h2 className="text-xl font-semibold mb-2">Input Numbers</h2>
        <Textarea placeholder="Enter numbers separated by comma or space" value={raw} onChange={(e) => setRaw(e.target.value)} />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Sorted Result</h2>
        <div className="rounded-lg border p-3 min-h-[80px] text-sm">
          {sorted.join(", ")}
        </div>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold">Settings</h2>
      <p className="text-muted-foreground">Personalize your workspace. More options coming soon.</p>
    </div>
  );
}
