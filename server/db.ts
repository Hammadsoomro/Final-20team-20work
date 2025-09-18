import { MongoClient, Db, Collection } from "mongodb";

// MongoDB client and DB instance
let client: MongoClient | null = null;
let db: Db | null = null;

// Connect to MongoDB and return DB instance
export async function getDb(): Promise<Db> {
  if (db) {
    console.log("📦 Reusing existing DB connection");
    return db;
  }

  const uri = process.env.MONGODB_URI || process.env.URI;
  if (!uri) throw new Error("❌ MONGODB_URI is not set");
  console.log("🔌 Connecting to MongoDB...");

  client = new MongoClient(uri);
  await client.connect();
  console.log("✅ MongoDB connected");

  const dbName = process.env.MONGODB_DB || "teamwork";
  db = client.db(dbName);
  console.log(`📂 Using database: ${dbName}`);

  return db;
}

// User document schema
export type UserDoc = {
  _id?: string;
  id: string;
  ownerId: string; // Team owner (admin). For admins, ownerId === id
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: "admin" | "scrapper" | "seller" | "salesman";
  blocked?: boolean;
  salesToday?: number;
  salesMonth?: number;
  createdAt: number;
};

// Get 'users' collection
export async function usersCol(): Promise<Collection<UserDoc>> {
  const database = await getDb();
  console.log("📁 Accessing 'users' collection");
  return database.collection<UserDoc>("users");
}
