export type Role = "admin" | "scrapper" | "seller" | "salesman";
export type User = {
  id: string;
  ownerId: string;
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

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("❌ API error:", data);
    throw new Error(data?.error || "Request failed");
  }

  return data as T;
}

export async function signupFull(
  firstName: string,
  lastName: string,
  phone: string,
  email: string,
  password: string,
): Promise<User> {
  return await api<User>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, phone, email, password }),
  });
}

export async function login(email: string, password: string): Promise<User> {
  return await api<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await api("/api/auth/logout", { method: "POST" });
}

export async function getUsers(currentUser?: User): Promise<User[]> {
  try {
    let ownerId: string | undefined = currentUser?.ownerId || currentUser?.id;
    if (!ownerId) {
      const me = await api<User>("/api/auth/me");
      ownerId = me.ownerId || me.id;
    }
    const url = ownerId
      ? `/api/users?ownerId=${encodeURIComponent(ownerId)}`
      : "/api/users";
    return await api<User[]>(url);
  } catch (e) {
    return [];
  }
}

export async function adminCreateMember(
  current: User,
  data: {
    name: string;
    email: string;
    password?: string;
    role: Exclude<Role, "admin">;
  },
): Promise<User> {
  return await api<User>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ ...data, ownerId: current.id }),
  });
}

export async function adminRemoveMember(id: string): Promise<void> {
  await api(`/api/admin/users/${id}`, { method: "DELETE" });
}

export async function adminToggleBlock(
  id: string,
  blocked: boolean,
): Promise<void> {
  await api(`/api/admin/users/${id}/block`, {
    method: "PATCH",
    body: JSON.stringify({ blocked }),
  });
}

export async function addSales(
  userId: string,
  todayDelta: number,
  monthDelta: number,
): Promise<void> {
  await api(`/api/users/${userId}/sales`, {
    method: "POST",
    body: JSON.stringify({ todayDelta, monthDelta }),
  });
}

export async function topSeller(currentUser: User): Promise<User | null> {
  const users = await getUsers(currentUser);
  const active = users.filter((u) => !u.blocked);
  if (!active.length) return null;
  return active.reduce((a, b) => (a.salesMonth! >= b.salesMonth! ? a : b));
}
