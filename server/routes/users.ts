import { RequestHandler } from "express";
import { usersCol } from "../db";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

export const signup: RequestHandler = async (req, res) => {
  try {
    const body = signupSchema.parse(req.body);
    const col = await usersCol();
    const exists = await col.findOne({ email: body.email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already exists" });
    const hasAdmin = (await col.countDocuments({ role: "admin" })) > 0;
    const role = hasAdmin ? ("seller" as const) : ("admin" as const);
    const user = {
      id: crypto.randomUUID(),
      firstName: body.firstName,
      lastName: body.lastName,
      name: `${body.firstName} ${body.lastName}`.trim(),
      phone: body.phone,
      email: body.email.toLowerCase(),
      passwordHash: await bcrypt.hash(body.password, 10),
      role,
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

export const login: RequestHandler = async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const col = await usersCol();
    const u = await col.findOne({ email: body.email.toLowerCase() });
    if (!u) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(body.password, u.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    if (u.blocked) return res.status(403).json({ error: "Account is blocked" });
    const { passwordHash, ...safe } = u;
    res.json(safe);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid request" });
  }
};

export const listUsers: RequestHandler = async (_req, res) => {
  const col = await usersCol();
  const list = await col
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
};

export const createMember: RequestHandler = async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["scrapper", "seller"]),
    password: z.string().optional(),
  });
  try {
    const body = schema.parse(req.body);
    const col = await usersCol();
    const exists = await col.findOne({ email: body.email.toLowerCase() });
    if (exists) return res.status(400).json({ error: "Email already exists" });
    const user = {
      id: crypto.randomUUID(),
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
