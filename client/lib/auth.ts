export type Role = "admin" | "scrapper" | "seller";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  blocked?: boolean;
  salesToday?: number;
  salesMonth?: number;
  createdAt: number;
};

const USERS_KEY = "app_users";
const CURRENT_USER_KEY = "current_user";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null) {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function signup(name: string, email: string, password: string): User {
  const users = getUsers();
  const already = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (already) throw new Error("Email already exists");
  const hasAdmin = users.some((u) => u.role === "admin");
  const role: Role = hasAdmin ? "seller" : "admin"; // First signup becomes admin
  const user: User = {
    id: uid(),
    name,
    email,
    password,
    role,
    blocked: false,
    salesToday: Math.floor(Math.random() * 2000),
    salesMonth: Math.floor(Math.random() * 50000),
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  return user;
}

export function login(email: string, password: string): User {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) throw new Error("Invalid credentials");
  if (user.blocked) throw new Error("Account is blocked");
  setCurrentUser(user);
  return user;
}

export function logout() {
  setCurrentUser(null);
}

export function adminCreateMember(
  current: User,
  data: { name: string; email: string; password?: string; role: Exclude<Role, "admin"> },
): User {
  if (current.role !== "admin") throw new Error("Only admin can create members");
  const users = getUsers();
  const exists = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
  if (exists) throw new Error("Email already exists");
  const user: User = {
    id: uid(),
    name: data.name,
    email: data.email,
    password: data.password ?? "secret",
    role: data.role,
    blocked: false,
    salesToday: 0,
    salesMonth: 0,
    createdAt: Date.now(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function adminRemoveMember(current: User, id: string) {
  if (current.role !== "admin") throw new Error("Only admin can remove");
  const users = getUsers();
  const next = users.filter((u) => u.id !== id);
  saveUsers(next);
  const cur = getCurrentUser();
  if (cur && cur.id === id) setCurrentUser(null);
}

export function adminToggleBlock(current: User, id: string, blocked: boolean) {
  if (current.role !== "admin") throw new Error("Only admin can block/unblock");
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");
  users[idx].blocked = blocked;
  saveUsers(users);
}

export function addSales(userId: string, todayDelta: number, monthDelta: number) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  users[idx].salesToday = (users[idx].salesToday ?? 0) + todayDelta;
  users[idx].salesMonth = (users[idx].salesMonth ?? 0) + monthDelta;
  saveUsers(users);
}

export function topSeller(): User | null {
  const users = getUsers().filter((u) => !u.blocked);
  if (!users.length) return null;
  return users.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b));
}
