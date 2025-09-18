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
    .project({ _id: 0, value: 1, createdAt: 1, status: 1 })
    .sort({ createdAt: 1 })
    .toArray();
  res.json({ pending: pending.map((d: any) => d.value) });
};

export const addLines: RequestHandler = async (req, res) => {
  const schema = z.object({ lines: z.array(z.string().min(1)).min(1) });
  const { lines } = schema.parse(req.body);
  const norm = Array.from(
    new Set(lines.map((l) => l.trim()).filter((l) => l.length > 0)),
  );
  const db = await getDb();
  const col = db.collection("sorter_queue");
  const now = Date.now();
  if (norm.length) {
    console.log("[sorter] addLines inserting", norm.length, "lines");
    await col.createIndex({ value: 1 }, { unique: true }).catch(() => {});
    const ops = norm.map((v) => ({
      updateOne: {
        filter: { value: v },
        update: {
          $setOnInsert: { value: v, status: "pending", createdAt: now },
        },
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
    io.emit(
      "sorter:update",
      list.map((d: any) => d.value),
    );
  }
  res.json({ ok: true });
};

export const distribute: RequestHandler = async (req, res) => {
  const schema = z.object({
    perUser: z.number().int().min(1),
    target: z.enum(["online", "all"]).default("online"),
    timerSeconds: z.number().int().min(0).optional(),
    selectedIds: z.array(z.string().min(1)).optional(),
  });
  const { perUser, target, timerSeconds, selectedIds } = schema.parse(req.body);
  const db = await getDb();
  const now = Date.now();
  const users = await db
    .collection("users")
    .find({ role: "salesman", blocked: { $ne: true } })
    .project({ id: 1, name: 1 })
    .toArray();

  let salesmanIds = users.map((u: any) => u.id);
  const online = await db
    .collection("presence")
    .find({ lastSeen: { $gt: now - 30_000 } })
    .project({ userId: 1, _id: 0 })
    .toArray();
  const onlineSet = new Set(online.map((o: any) => o.userId));
  if (target === "online") {
    salesmanIds = salesmanIds.filter((id) => onlineSet.has(id));
  }
  // If selectedIds provided, restrict to that subset (still honoring availability filters)
  if (selectedIds && selectedIds.length) {
    const selectedSet = new Set(selectedIds);
    salesmanIds = salesmanIds.filter((id) => selectedSet.has(id));
  }
  if (!salesmanIds.length)
    return res.status(400).json({ error: "No salesmen available" });

  const take = perUser * salesmanIds.length;
  const qcol = db.collection("sorter_queue");
  // Only take strictly pending (avoid re-assigning items already assigned)
  const pending = await qcol
    .find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(take)
    .toArray();
  if (!pending.length) {
    console.log("[sorter] distribute: no pending items");
    return res.json({ assignments: [], remaining: 0 });
  }

  // Create assignments for users but don't send immediately. Salesmen will claim when their timer completes.
  const assignments: { userId: string; values: string[] }[] = salesmanIds.map(
    (id) => ({ userId: id, values: [] }),
  );
  for (let i = 0; i < pending.length; i++) {
    const owner = assignments[i % assignments.length];
    owner.values.push(pending[i].value as string);
  }

  const ids = pending.map((p) => p._id);
  await qcol.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "assigned", assignedAt: Date.now() } },
  );

  const assignCol = db.collection("sorter_assignments");
  const ops = assignments
    .filter((a) => a.values.length)
    .map((a) => ({
      insertOne: {
        document: {
          userId: a.userId,
          values: a.values,
          status: "pending",
          createdAt: Date.now(),
        },
      },
    }));
  if (ops.length)
    await assignCol.bulkWrite(ops, { ordered: false }).catch(() => {});

  const remaining = await qcol.countDocuments({ status: { $ne: "sent" } });

  const fresh = await qcol
    .find({ status: { $ne: "sent" } })
    .project({ _id: 0, value: 1 })
    .sort({ createdAt: 1 })
    .toArray();

  const io = await getIo();
  console.log("[sorter] distribute: assigned", assignments.map((a) => ({ userId: a.userId, count: a.values.length })).filter(a=>a.count>0));
  io?.emit(
    "sorter:update",
    fresh.map((d: any) => d.value),
  );

  // Insert a room-level announcement for sorter with timer info so clients (salesmen) can see and start their timers
  try {
    const msgCol = db.collection("messages");
    const announce = {
      roomId: "sorter",
      senderId: "system",
      text: JSON.stringify({
        type: "sorter:announce",
        perUser,
        timerSeconds: timerSeconds || 0,
        total: assignments.reduce((s, a) => s + a.values.length, 0),
        timestamp: Date.now(),
      }),
      createdAt: Date.now(),
    };
    await msgCol.insertOne(announce as any);
    io?.to("sorter").emit("chat:message", announce);
  } catch (e) {
    // ignore
  }

  res.json({ assignments, remaining });
};

export const clearPending: RequestHandler = async (_req, res) => {
  try {
    const db = await getDb();
    const col = db.collection("sorter_queue");
    const rem = await col.deleteMany({ status: { $ne: "sent" } });
    const fresh = await col
      .find({ status: { $ne: "sent" } })
      .project({ _id: 0, value: 1 })
      .sort({ createdAt: 1 })
      .toArray();
    const io = await getIo();
    io?.emit(
      "sorter:update",
      fresh.map((d: any) => d.value),
    );
    console.log("[sorter] clearPending removed", rem.deletedCount);
    res.json({ ok: true, removed: rem.deletedCount ?? 0 });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

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

export const listAssignments: RequestHandler = async (req, res) => {
  try {
    const userId =
      (req.query.userId as string) || (await getUserIdFromReq(req));
    if (!userId) return res.status(400).json({ error: "userId required" });
    const db = await getDb();
    const rows = await db
      .collection("sorter_assignments")
      .find({ userId: String(userId), status: { $in: ["pending", "claimed"] } })
      .toArray();
    res.json({ assignments: rows });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const claimAssignment: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({ userId: z.string().min(1) });
    const { userId } = schema.parse(req.body);
    const db = await getDb();
    const a = await db
      .collection("sorter_assignments")
      .findOneAndUpdate(
        { userId, status: "pending" },
        { $set: { status: "sent", sentAt: Date.now() } },
        { returnDocument: "after" },
      );
    if (!a.value) return res.status(404).json({ error: "No assignments" });
    const values = a.value.values || [];

    // Mark these queue items as sent and broadcast update so they are removed from queued list
    try {
      const qcol = db.collection("sorter_queue");
      if (values.length) {
        await qcol.updateMany(
          { value: { $in: values } },
          { $set: { status: "sent", sentAt: Date.now() } },
        );
        const fresh = await qcol
          .find({ status: { $ne: "sent" } })
          .project({ _id: 0, value: 1 })
          .sort({ createdAt: 1 })
          .toArray();
        const io = await getIo();
        io?.emit(
          "sorter:update",
          fresh.map((d: any) => d.value),
        );
      }
    } catch {}

    const msgCol = db.collection("messages");
    const roomId = dmRoom("system", userId);
    const doc = {
      roomId,
      senderId: "system",
      text: (values || []).join("\n"),
      createdAt: Date.now(),
    };
    await msgCol.insertOne(doc as any);
    const io = await getIo();
    io?.to(roomId).emit("chat:message", doc);
    res.json({ values });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

// New: assign specific number of pending lines directly to a given user
export const assignToUser: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({ userId: z.string().min(1), count: z.number().int().min(1).max(100).optional() });
    const { userId, count } = schema.parse(req.body);
    const take = count || 3;
    const db = await getDb();
    const qcol = db.collection('sorter_queue');
    const pending = await qcol.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(take).toArray();
    if (!pending.length) return res.json({ values: [] });
    const values = pending.map((p: any) => p.value as string);
    const ids = pending.map((p: any) => p._id);
    await qcol.updateMany({ _id: { $in: ids } }, { $set: { status: 'sent', sentAt: Date.now() } });

    // persist DM message to the user
    const msgCol = db.collection('messages');
    const roomId = dmRoom('system', userId);
    const doc = { roomId, senderId: 'system', text: values.join('\n'), createdAt: Date.now() } as any;
    await msgCol.insertOne(doc);

    const io = await getIo();
    io?.to(roomId).emit('chat:message', doc);

    // Insert assignment record for history
    try {
      const assignCol = db.collection('sorter_assignments');
      await assignCol.insertOne({ userId, values, status: 'sent', createdAt: Date.now() });
    } catch (e) {
      // ignore
    }

    const fresh = await qcol.find({ status: { $ne: 'sent' } }).project({ _id: 0, value: 1 }).sort({ createdAt: 1 }).toArray();
    io?.emit('sorter:update', fresh.map((d: any) => d.value));

    res.json({ values });
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Invalid' });
  }
};
