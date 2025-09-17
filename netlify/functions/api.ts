import serverless from "serverless-http";
import { createServer } from "../../server";
import { getDb } from "../../server/db";
import bcrypt from "bcryptjs";

let _handler: any = null;

async function handleSignupEvent(event: any) {
  try {
    const raw = event.body || "";
    const body = raw && typeof raw === "string" ? JSON.parse(raw) : raw;
    const { firstName, lastName, phone, email, password } = body || {};
    if (!firstName || !lastName || !phone || !email || !password) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }
    const db = await getDb();
    const col = db.collection("users");
    const exists = await col.findOne({ email: email.toLowerCase() });
    if (exists) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email already exists" }),
      };
    }
    const id = crypto.randomUUID();
    const user = {
      id,
      ownerId: id,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      blocked: false,
      salesToday: 0,
      salesMonth: 0,
      createdAt: Date.now(),
    };
    await col.insertOne(user as any);
    const token = crypto.randomUUID();
    await db
      .collection("sessions")
      .insertOne({ token, userId: id, createdAt: Date.now() });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `session=${token}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify({
        id: user.id,
        ownerId: user.ownerId,
        name: user.name,
        email: user.email,
        role: user.role,
        blocked: false,
        salesToday: 0,
        salesMonth: 0,
        createdAt: user.createdAt,
      }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message }),
    };
  }
}

async function handleLoginEvent(event: any) {
  try {
    const raw = event.body || "";
    const body = raw && typeof raw === "string" ? JSON.parse(raw) : raw;
    const { email, password } = body || {};
    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing fields" }),
      };
    }
    const db = await getDb();
    const col = db.collection("users");
    const u = await col.findOne({ email: email.toLowerCase() });
    if (!u)
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid credentials" }),
      };
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok)
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid credentials" }),
      };
    if (u.blocked)
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Account is blocked" }),
      };
    const token = crypto.randomUUID();
    await db
      .collection("sessions")
      .insertOne({ token, userId: u.id, createdAt: Date.now() });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `session=${token}; Path=/; HttpOnly; SameSite=Lax`,
      },
      body: JSON.stringify({
        id: u.id,
        ownerId: u.ownerId,
        name: u.name,
        email: u.email,
        role: u.role,
        blocked: u.blocked,
        salesToday: u.salesToday,
        salesMonth: u.salesMonth,
        createdAt: u.createdAt,
      }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: e.message }),
    };
  }
}

export const handler = async (event: any, context: any) => {
  const method = (event.httpMethod || event.method || "GET").toUpperCase();
  // Try to detect signup/login by inspecting body content (fallback when path is proxied)
  if (method === "POST") {
    let parsedBody: any = null;
    try {
      if (event.body && typeof event.body === "string") {
        try {
          parsedBody = JSON.parse(event.body);
        } catch (err) {
          // try base64
          try {
            const decoded = Buffer.from(event.body, "base64").toString("utf-8");
            parsedBody = JSON.parse(decoded);
          } catch (e) {
            parsedBody = null;
          }
        }
      } else parsedBody = event.body;
    } catch {}
    if (
      parsedBody &&
      parsedBody.firstName &&
      parsedBody.lastName &&
      parsedBody.phone &&
      parsedBody.email &&
      parsedBody.password
    ) {
      return await handleSignupEvent(event);
    }
    if (
      parsedBody &&
      parsedBody.email &&
      parsedBody.password &&
      !parsedBody.firstName
    ) {
      return await handleLoginEvent(event);
    }
  }

  if (!_handler) {
    const app = await createServer();
    _handler = serverless(app as any);
  }
  return _handler(event, context);
};
