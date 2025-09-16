import { RequestHandler } from "express";
import { getDb } from "../db";
import { z } from "zod";
import { Server } from "socket.io";

function dmRoom(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

async function getIo(): Promise<Server | null> {
  try {
    const mod = await import("../socket");
    // @ts-ignore
    return (mod as any).getIO?.() ?? null;
  } catch {
    return null;
  }
}

export const listPending: RequestHandler = async (_req, res) => {
  const db = await getDb();
  const col = db.collection("sorter_queue");
  const pending = await col
    .find({ status: { $ne: "sent" } })
    .project({ _id: 0, value: 1, createdAt: 1 })
    .sort({ createdAt: 1 })
    .toArray();
  res.json({ pending: pending.map((d: any) => d.value) });
};

export const addLines: RequestHandler = async (req, res) => {
  const schema = z.object({ lines: z.array(z.string().min(1)).min(1) });
  const { lines } = schema.parse(req.body);
  const norm = Array.from(
    new Set(
      lines
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    ),
  );
  const db = await getDb();
  const col = db.collection("sorter_queue");
  const now = Date.now();
  if (norm.length) {
    await col.createIndex({ value: 1 }, { unique: true }).catch(() => {});
    const ops = norm.map((v) => ({
      updateOne: {
        filter: { value: v },
        update: { $setOnInsert: { value: v, status: "pending", createdAt: now } },
        upsert: true,
      },
    }));
    await col.bulkWrite(ops, { ordered: false }).catch(() => {});
  }
  const io = await getIo();
  if (io) {
    const list = await col
      .find({ status: { $ne: "sent" } })
      .project({ _id: 0, value: 1 })
      .sort({ createdAt: 1 })
      .toArray();
    io.emit("sorter:update", list.map((d: any) => d.value));
  }
  res.json({ ok: true });
};

export const distribute: RequestHandler = async (req, res) => {
  const schema = z.object({
    perUser: z.number().int().min(1),
    target: z.enum(["online", "all"]).default("online"),
  });
  const { perUser, target } = schema.parse(req.body);
  const db = await getDb();
  const now = Date.now();
  const users = await db
    .collection("users")
    .find({ role: "seller", blocked: { $ne: true } })
    .project({ id: 1, name: 1 })
    .toArray();

  let sellerIds = users.map((u: any) => u.id);
  if (target === "online") {
    const online = await db
      .collection("presence")
      .find({ lastSeen: { $gt: now - 30_000 } })
      .project({ userId: 1, _id: 0 })
      .toArray();
    const onlineSet = new Set(online.map((o: any) => o.userId));
    sellerIds = sellerIds.filter((id) => onlineSet.has(id));
  }
  if (!sellerIds.length) return res.status(400).json({ error: "No sellers available" });

  const take = perUser * sellerIds.length;
  const qcol = db.collection("sorter_queue");
  const pending = await qcol
    .find({ status: { $ne: "sent" } })
    .sort({ createdAt: 1 })
    .limit(take)
    .toArray();
  if (!pending.length) return res.json({ assignments: [], remaining: 0 });

  const io = await getIo();
  const msgCol = db.collection("messages");

  const assignments: { userId: string; values: string[] }[] = sellerIds.map((id) => ({ userId: id, values: [] }));
  for (let i = 0; i < pending.length; i++) {
    const owner = assignments[i % assignments.length];
    owner.values.push(pending[i].value as string);
  }

  const ids = pending.map((p) => p._id);
  await qcol.updateMany({ _id: { $in: ids } }, { $set: { status: "sent", sentAt: Date.now() } });

  for (const a of assignments) {
    if (!a.values.length) continue;
    const text = a.values.join("\n");
    const { userId } = a;
    const roomId = dmRoom("system", userId);
    const doc = { roomId, senderId: "system", text, createdAt: Date.now() };
    await msgCol.insertOne(doc as any);
    io?.to(roomId).emit("chat:message", doc);
  }

  const remaining = await qcol.countDocuments({ status: { $ne: "sent" } });
  const fresh = await qcol
    .find({ status: { $ne: "sent" } })
    .project({ _id: 0, value: 1 })
    .sort({ createdAt: 1 })
    .toArray();
  io?.emit("sorter:update", fresh.map((d: any) => d.value));

  res.json({ assignments, remaining });
};
