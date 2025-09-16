import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { getDb } from "./db";

function dmRoom(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

export function setupSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
  });

  io.on("connection", async (socket) => {
    const userId = (socket.handshake.query.userId as string) || "";
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    socket.data.userId = userId;
    const db = await getDb();

    await db
      .collection("presence")
      .updateOne(
        { userId },
        { $set: { userId, lastSeen: Date.now() } },
        { upsert: true },
      );

    socket.join("team");
    emitPresence(io).catch(() => {});

    socket.on("presence:heartbeat", async () => {
      await db
        .collection("presence")
        .updateOne(
          { userId },
          { $set: { userId, lastSeen: Date.now() } },
          { upsert: true },
        );
      emitPresence(io).catch(() => {});
    });

    socket.on("chat:team:send", async (payload: { text: string }) => {
      const text = (payload?.text || "").trim();
      if (!text) return;
      const doc = {
        roomId: "team",
        senderId: userId,
        text,
        createdAt: Date.now(),
      };
      await db.collection("messages").insertOne(doc as any);
      io.to("team").emit("chat:message", doc);
    });

    socket.on(
      "chat:dm:send",
      async (payload: { toUserId: string; text: string }) => {
        const toUserId = (payload?.toUserId || "").trim();
        const text = (payload?.text || "").trim();
        if (!toUserId || !text) return;
        const roomId = dmRoom(userId, toUserId);
        const doc = { roomId, senderId: userId, text, createdAt: Date.now() };
        await db.collection("messages").insertOne(doc as any);
        io.to(roomId).emit("chat:message", doc);
      },
    );

    socket.on("chat:join", (payload: { roomId: string }) => {
      const roomId = (payload?.roomId || "").trim();
      if (!roomId) return;
      socket.join(roomId);
    });

    socket.on("disconnect", async () => {
      await db
        .collection("presence")
        .updateOne(
          { userId },
          { $set: { userId, lastSeen: Date.now() - 60_000 } },
          { upsert: true },
        );
      emitPresence(io).catch(() => {});
    });
  });

  return io;
}

async function emitPresence(io: Server) {
  const db = await getDb();
  const now = Date.now();
  const online = await db
    .collection("presence")
    .find({ lastSeen: { $gt: now - 30_000 } })
    .project({ userId: 1, _id: 0 })
    .toArray();
  io.emit("presence:update", online.map((o: any) => o.userId));
}
