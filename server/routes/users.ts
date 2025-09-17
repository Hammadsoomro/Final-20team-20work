import { RequestHandler } from "express";
import { usersCol, getDb } from "../db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { RequestHandler } from "express";

const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function parseBodyFallback(req: any) {
  if (req && req.body && Object.keys(req.body).length) return req.body;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req)
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    const raw = Buffer.concat(chunks).toString("utf-8").trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      const params = new URLSearchParams(raw);
      const obj: any = {};
      for (const [k, v] of params) obj[k] = v;
      return obj;
    }
  } catch {
    return {};
  }
}

export const signup: RequestHandler = async (req, res) => {
  try {
    const maybeBody =
      req && req.body && Object.keys(req.body).length
        ? req.body
        : await parseBodyFallback(req);
    const body = signupSchema.parse(maybeBody);
    const col = await usersCol();
    const exists = await col.findOne({ email: body.email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already exists" });
    const id = crypto.randomUUID();
    const user = {
      id,
      ownerId: id,
      firstName: body.firstName,
      lastName: body.lastName,
      name: `${body.firstName} ${body.lastName}`.trim(),
      phone: body.phone,
      email: body.email.toLowerCase(),
      passwordHash: await bcrypt.hash(body.password, 10),
      role: "admin" as const,
      blocked: false,
      salesToday: 0,
      salesMonth: 0,
      createdAt: Date.now(),
    };
    await col.insertOne(user as any);

    // create session
    const db = await getDb();
    const token = crypto.randomUUID();
    await db
      .collection("sessions")
      .insertOne({ token, userId: id, createdAt: Date.now() });
    res.cookie("session", token, { httpOnly: true, sameSite: "lax" });

    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const maybeBody =
      req && req.body && Object.keys(req.body).length
        ? req.body
        : await parseBodyFallback(req);
    const body = loginSchema.parse(maybeBody);
    const col = await usersCol();
    const u = await col.findOne({ email: body.email.toLowerCase() });
    if (!u) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(body.password, (u as any).passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    if (u.blocked) return res.status(403).json({ error: "Account is blocked" });

    // create session
    const db = await getDb();
    const token = crypto.randomUUID();
    await db
      .collection("sessions")
      .insertOne({ token, userId: u.id, createdAt: Date.now() });
    res.cookie("session", token, { httpOnly: true, sameSite: "lax" });

    const { passwordHash, ...safe } = u as any;
    res.json(safe);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

export const listUsers: RequestHandler = async (req, res) => {
  const col = await usersCol();
  const ownerId =
    typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
  const filter = ownerId ? { ownerId } : {};
  const list = await col
    .find(filter, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
};

export const getUserById: RequestHandler = async (req, res) => {
  const col = await usersCol();
  const id = req.params.id;
  const user = await col.findOne({ id }, { projection: { passwordHash: 0 } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
};

export const updateUser: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      password: z.string().min(6).optional(),
      notificationsEnabled: z.boolean().optional(),
      salesCategory: z.string().optional(),
      salesToday: z.number().optional(),
    });
    const body = schema.parse(req.body);
    const col = await usersCol();
    const updates: any = {};
    if (body.name) {
      updates.name = body.name;
      updates.firstName = body.name.split(" ")[0] || body.name;
      updates.lastName = body.name.split(" ").slice(1).join(" ") || "";
    }
    if (typeof body.notificationsEnabled === "boolean") {
      updates.notificationsEnabled = body.notificationsEnabled;
    }
    if (typeof body.salesCategory === "string") {
      updates.salesCategory = body.salesCategory;
    }
    if (typeof body.salesToday === "number") {
      updates.salesToday = body.salesToday;
    }
    if (body.password) {
      updates.passwordHash = await bcrypt.hash(body.password, 10);
    }
    if (!Object.keys(updates).length) return res.json({ ok: true });
    await col.updateOne({ id: req.params.id }, { $set: updates });
    const user = await col.findOne({ id: req.params.id }, { projection: { passwordHash: 0 } });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

export const setSalesCategory: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({ category: z.string().min(1) });
    const { category } = schema.parse(req.body);
    const col = await usersCol();
    await col.updateOne({ id: req.params.id }, { $set: { salesCategory: category } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

// get current user from session cookie
async function getUserFromReq(req: any) {
  try {
    const cookie = req.headers?.cookie || "";
    const m = cookie
      .split(";")
      .map((s: any) => s.trim())
      .find((c: any) => c.startsWith("session="));
    if (!m) return null;
    const token = m.split("=")[1];
    if (!token) return null;
    const db = await getDb();
    const s = await db.collection("sessions").findOne({ token });
    if (!s) return null;
    const user = await (
      await usersCol()
    ).findOne({ id: s.userId }, { projection: { passwordHash: 0 } });
    return user;
  } catch {
    return null;
  }
}

export const me: RequestHandler = async (req, res) => {
  const u = await getUserFromReq(req);
  if (!u) return res.status(401).json({ error: "Not authenticated" });
  res.json(u);
};

export const logout: RequestHandler = async (req, res) => {
  try {
    const cookie = req.headers?.cookie || "";
    const m = cookie
      .split(";")
      .map((s: any) => s.trim())
      .find((c: any) => c.startsWith("session="));
    const token = m ? m.split("=")[1] : null;
    if (token) {
      const db = await getDb();
      await db.collection("sessions").deleteOne({ token });
    }
    res.clearCookie("session");
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const createMember: RequestHandler = async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["scrapper", "seller", "salesman"]),
    password: z.string().optional(),
    ownerId: z.string().min(1),
  });
  try {
    const body = schema.parse(req.body);
    const col = await usersCol();
    const exists = await col.findOne({ email: body.email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already exists" });
    const admin = await col.findOne({ id: body.ownerId, role: "admin" });
    if (!admin) return res.status(400).json({ error: "Invalid ownerId" });
    const user = {
      id: crypto.randomUUID(),
      ownerId: body.ownerId,
      firstName: body.name.split(" ")[0] || body.name,
      lastName: body.name.split(" ").slice(1).join(" ") || "",
      name: body.name,
      phone: "",
      email: body.email.toLowerCase(),
      passwordHash: await bcrypt.hash(body.password ?? "secret", 10),
      role: body.role,
      blocked: false,
      salesToday: 0,
      salesMonth: 0,
      createdAt: Date.now(),
    };
    await col.insertOne(user as any);
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

export const removeMember: RequestHandler = async (req, res) => {
  const col = await usersCol();
  await col.deleteOne({ id: req.params.id });
  res.json({ ok: true });
};

export const toggleBlock: RequestHandler = async (req, res) => {
  const schema = z.object({ blocked: z.boolean() });
  try {
    const { blocked } = schema.parse(req.body);
    const col = await usersCol();
    await col.updateOne({ id: req.params.id }, { $set: { blocked } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

export const addSalesApi: RequestHandler = async (req, res) => {
  const schema = z.object({
    todayDelta: z.number().int(),
    monthDelta: z.number().int(),
  });
  try {
    const { todayDelta, monthDelta } = schema.parse(req.body);
    const col = await usersCol();
    await col.updateOne(
      { id: req.params.id },
      { $inc: { salesToday: todayDelta, salesMonth: monthDelta } },
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};
