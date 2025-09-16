import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  signup as signupRoute,
  login as loginRoute,
  listUsers,
  createMember,
  removeMember,
  toggleBlock,
  addSalesApi,
} from "./routes/users";

export async function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Demo
  app.get("/api/demo", handleDemo);

  // Auth & Users (MongoDB)
  app.post("/api/auth/signup", signupRoute);
  app.post("/api/auth/login", loginRoute);
  app.get("/api/users", listUsers);
  app.post("/api/admin/users", createMember);
  app.delete("/api/admin/users/:id", removeMember);
  app.patch("/api/admin/users/:id/block", toggleBlock);
  app.post("/api/users/:id/sales", addSalesApi);

  // Chat & Presence
  async chat = await import("./routes/chat");
  app.get("/api/chat/:roomId/messages", chat.listMessages);
  app.post("/api/chat/:roomId/messages", chat.postMessage);
  app.get("/api/chat/dm/:a/:b", chat.getDmRoomId);
  app.post("/api/presence/heartbeat", chat.heartbeat);
  app.get("/api/presence/online", chat.listOnline);
  app.post("/api/distribute", chat.distributeNumbers);

  return app;
}
