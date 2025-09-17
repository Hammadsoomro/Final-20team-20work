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
  app.use(cors({ origin: true, credentials: true }));
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
  app.post("/api/auth/logout", (await import("./routes/users")).logout);
  app.get("/api/auth/me", (await import("./routes/users")).me);
  app.get("/api/users", listUsers);
  app.get("/api/users/:id", (await import("./routes/users")).getUserById);
  app.patch("/api/users/:id", (await import("./routes/users")).updateUser);
  app.post("/api/users/:id/salesCategory", (await import("./routes/users")).setSalesCategory);
  app.post("/api/admin/users", createMember);
  app.delete("/api/admin/users/:id", removeMember);
  app.patch("/api/admin/users/:id/block", toggleBlock);
  app.post("/api/users/:id/sales", addSalesApi);

  // Chat & Presence
  const chat = await import("./routes/chat");
  app.get("/api/chat/:roomId/messages", chat.listMessages);
  app.post("/api/chat/:roomId/messages", chat.postMessage);
  app.get("/api/chat/dm/:a/:b", chat.getDmRoomId);
  app.post("/api/presence/heartbeat", chat.heartbeat);
  app.get("/api/presence/online", chat.listOnline);
  app.post("/api/distribute", chat.distributeNumbers);

  // Unread map APIs
  app.get("/api/unread", chat.getUnread);
  app.post("/api/unread/inc", chat.incUnread);
  app.post("/api/unread/clear", chat.clearUnread);
  app.post("/api/unread/clearAll", chat.clearAllUnread);

  // Sorter
  const sorter = await import("./routes/sorter");
  app.get("/api/sorter", sorter.listPending);
  app.post("/api/sorter", sorter.addLines);
  app.post("/api/sorter/distribute", sorter.distribute);
  app.get("/api/sorter/assignments", sorter.listAssignments);
  app.post("/api/sorter/claim", sorter.claimAssignment);

  // Attendance
  const attendance = await import("./routes/attendance");
  app.post("/api/attendance", attendance.postAttendance);
  app.get("/api/attendance", attendance.listAttendance);

  return app;
}
