import { RequestHandler } from "express";
import { getDb } from "../db";
import { z } from "zod";

function dmRoom(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

export const listMessages: RequestHandler = async (req, res) => {
  const db = await getDb();
  const roomId = req.params.roomId;
  const limit = Number(req.query.limit ?? 100);
  const items = await db
    .collection("messages")
    .find({ roomId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
  res.json(items);
};

export const postMessage: RequestHandler = async (req, res) => {
  const schema = z.object({
    senderId: z.string().min(1),
    text: z.string().min(1),
  });
  try {
    const { senderId, text } = schema.parse(req.body);
    const db = await getDb();
    const doc = {
      roomId: req.params.roomId,
      senderId,
      text,
      createdAt: Date.now(),
    };
    await db.collection("messages").insertOne(doc as any);
    res.json(doc);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const getDmRoomId: RequestHandler = (req, res) => {
  const { a, b } = req.params as any;
  res.json({ roomId: dmRoom(a, b) });
};

export const heartbeat: RequestHandler = async (req, res) => {
  const schema = z.object({ userId: z.string().min(1) });
  try {
    const { userId } = schema.parse(req.body);
    const db = await getDb();
    await db
      .collection("presence")
      .updateOne(
        { userId },
        { $set: { userId, lastSeen: Date.now() } },
        { upsert: true },
      );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const listOnline: RequestHandler = async (_req, res) => {
  const db = await getDb();
  const now = Date.now();
  const presence = await db
    .collection("presence")
    .find({ lastSeen: { $gt: now - 30_000 } })
    .toArray();
  res.json(presence.map((p) => p.userId));
};

// unread map endpoints (per-user)
async function getUserIdFromReq(req: any) {
  const cookie = req.headers?.cookie || "";
  const m = cookie
    .split(";")
    .map((s: any) => s.trim())
    .find((c: any) => c.startsWith("session="));
  const token = m ? m.split("=")[1] : null;
  if (!token) return null;
  const db = await getDb();
  const s = await db.collection("sessions").findOne({ token });
  if (!s) return null;
  return s.userId as string;
}

export const getUnread: RequestHandler = async (req, res) => {
  try {
    const userId = await getUserIdFromReq(req);
    if (!userId) return res.json({});
    const db = await getDb();
    const rows = await db.collection("unread").find({ userId }).toArray();
    const map: Record<string, number> = {};
    for (const r of rows) map[r.roomId] = r.count || 0;
    res.json(map);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const incUnread: RequestHandler = async (req, res) => {
  try {
    const { roomId } = z.object({ roomId: z.string().min(1) }).parse(req.body);
    const userId = await getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const db = await getDb();
    await db
      .collection("unread")
      .updateOne(
        { userId, roomId },
        { $inc: { count: 1 }, $setOnInsert: { userId, roomId } },
        { upsert: true },
      );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const clearUnread: RequestHandler = async (req, res) => {
  try {
    const { roomId } = z.object({ roomId: z.string().min(1) }).parse(req.body);
    const userId = await getUserIdFromReq(req);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const db = await getDb();
    await db.collection("unread").deleteOne({ userId, roomId });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const clearAllUnread: RequestHandler = async (_req, res) => {
  try {
    const userId = await getUserIdFromReq(_req as any);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const db = await getDb();
    await db.collection("unread").deleteMany({ userId });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const distributeNumbers: RequestHandler = async (req, res) => {
  const schema = z.object({
    numbers: z.array(z.string().min(1)),
    roles: z.array(z.enum(["scrapper", "salesman"])),
  });
  try {
    const { numbers, roles } = schema.parse(req.body);
    const db = await getDb();
    const now = Date.now();
    const onlineIds = (
      await db
        .collection("presence")
        .find({ lastSeen: { $gt: now - 30_000 } })
        .toArray()
    ).map((p: any) => p.userId);

    const users = await db
      .collection("users")
      .find({
        id: { $in: onlineIds },
        role: { $in: roles },
        blocked: { $ne: true },
      })
      .project({ id: 1, name: 1 })
      .toArray();

    if (!users.length)
      return res
        .status(400)
        .json({ error: "No online users for selected roles" });

    const assignments: { number: string; userId: string; userName: string }[] =
      [];
    for (let i = 0; i < numbers.length; i++) {
      const u = users[i % users.length];
      assignments.push({
        number: numbers[i],
        userId: u.id,
        userName: (u as any).name,
      });
    }

    if (assignments.length) {
      await db
        .collection("assignments")
        .insertMany(assignments.map((a) => ({ ...a, createdAt: Date.now() })));
    }

    const summary: Record<string, { count: number; userName: string }> = {};
    for (const a of assignments) {
      summary[a.userId] = summary[a.userId] || {
        count: 0,
        userName: a.userName,
      };
      summary[a.userId].count++;
    }

    res.json({ assignments, summary });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};
