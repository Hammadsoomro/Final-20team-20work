import { RequestHandler } from "express";
import { getDb } from "../db";

export const postAttendance: RequestHandler = async (req, res) => {
  try {
    const cookie = req.headers?.cookie || "";
    const m = cookie
      .split(";")
      .map((s: any) => s.trim())
      .find((c: any) => c.startsWith("session="));
    const token = m ? m.split("=")[1] : null;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const db = await getDb();
    const s = await db.collection("sessions").findOne({ token });
    if (!s) return res.status(401).json({ error: "Not authenticated" });
    const userId = s.userId as string;
    const now = Date.now();
    const iso = new Date(now).toISOString();
    const u = await db.collection("users").findOne({ id: userId });
    const ownerId = u ? u.ownerId || u.id : userId;
    // Enforce once-per-20-hours rule per user
    const last = await db
      .collection("attendance")
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();
    const TWENTY_HOURS = 20 * 60 * 60 * 1000;
    if (last.length && now - (last[0].timestamp || 0) < TWENTY_HOURS) {
      const nextAllowed = new Date((last[0].timestamp || 0) + TWENTY_HOURS).toISOString();
      return res.json({ ok: false, reason: "too_soon", nextAllowed });
    }

    const doc = { userId, ownerId, timestamp: now, iso };
    await db.collection("attendance").insertOne(doc as any);
    res.json({ ok: true, recordedAt: iso });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};

export const listAttendance: RequestHandler = async (req, res) => {
  try {
    const db = await getDb();
    const ownerId =
      typeof req.query.ownerId === "string" ? req.query.ownerId : undefined;
    if (!ownerId) return res.status(400).json({ error: "ownerId required" });
    const items = await db
      .collection("attendance")
      .find({ ownerId })
      .sort({ timestamp: -1 })
      .limit(200)
      .toArray();
    res.json(items);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid" });
  }
};
