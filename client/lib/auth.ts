export type Role = "admin" | "scrapper" | "seller";

export type Role = "admin" | "scrapper" | "seller";
export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  phone?: string;
  email: string;
  role: Role;
  blocked?: boolean;
  salesToday?: number;
  salesMonth?: number;
  createdAt: number;
};

const USERS_KEY = "app_users";
const CURRENT_USER_KEY = "current_user";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data as T;
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

export async function signupFull(
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  password: string,
): Promise<User> {
  try {
    const user = await api<User>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ firstName, lastName, phone, email, password }),
    });
    setCurrentUser(user);
    return user;
  } catch (e) {
    // Fallback to local (for offline/demo)
    const users = getUsersLocal();
    const already = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (already) throw e;
    const hasAdmin = users.some((u) => u.role === "admin");
    const role: Role = hasAdmin ? "seller" : "admin";
    const user: User = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone,
      email,
      role,
      blocked: false,
      salesToday: 0,
      salesMonth: 0,
      createdAt: Date.now(),
    };
    users.push(user);
    saveUsersLocal(users);
    setCurrentUser(user);
    return user;
  }
}

export async function login(email: string, password: string): Promise<User> {
  try {
    const user = await api<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setCurrentUser(user);
    return user;
  } catch (e) {
    // Fallback
    const users = getUsersLocal();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!user) throw e;
    setCurrentUser(user);
    return user;
  }
}

export function logout() {
  setCurrentUser(null);
}

export async function getUsers(): Promise<User[]> {
  try {
    return await api<User[]>("/api/users");
  } catch {
    return getUsersLocal();
  }
}

export async function adminCreateMember(
  _current: User,
  data: {
    name: string;
    email: string;
    password?: string;
    role: Exclude<Role, "admin">;
  },
): Promise<User> {
  try {
    return await api<User>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (e) {
    const users = getUsersLocal();
    const user: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      role: data.role,
      blocked: false,
      salesToday: 0,
      salesMonth: 0,
      createdAt: Date.now(),
    };
    users.push(user);
    saveUsersLocal(users);
    return user;
  }
}

export async function adminRemoveMember(_current: User, id: string) {
  try {
    await api("/api/admin/users/" + id, { method: "DELETE" });
  } catch {
    const users = getUsersLocal().filter((u) => u.id !== id);
    saveUsersLocal(users);
  }
}

export async function adminToggleBlock(
  _current: User,
  id: string,
  blocked: boolean,
) {
  try {
    await api("/api/admin/users/" + id + "/block", {
      method: "PATCH",
      body: JSON.stringify({ blocked }),
    });
  } catch {
    const users = getUsersLocal();
    const idx = users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      users[idx].blocked = blocked;
      saveUsersLocal(users);
    }
  }
}

export async function addSales(
  userId: string,
  todayDelta: number,
  monthDelta: number,
) {
  try {
    await api("/api/users/" + userId + "/sales", {
      method: "POST",
      body: JSON.stringify({ todayDelta, monthDelta }),
    });
  } catch {
    const users = getUsersLocal();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return;
    users[idx].salesToday = (users[idx].salesToday ?? 0) + todayDelta;
    users[idx].salesMonth = (users[idx].salesMonth ?? 0) + monthDelta;
    saveUsersLocal(users);
  }
}

export async function topSeller(): Promise<User | null> {
  const users = await getUsers();
  const active = users.filter((u) => !u.blocked);
  if (!active.length) return null;
  return active.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b));
}

// Local fallback storage helpers
function getUsersLocal(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}
function saveUsersLocal(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
