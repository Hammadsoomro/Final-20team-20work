import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb() {
  if (db) return db;
  const uri = process.env.MONGODB_URI || process.env.URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB || "teamwork";
  db = client.db(dbName);
  return db;
}

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
  role: "admin" | "scrapper" | "seller";
  blocked?: boolean;
  salesToday?: number;
  salesMonth?: number;
  createdAt: number;
};

export async function usersCol(): Promise<Collection<UserDoc>> {
  const database = await getDb();
  return database.collection<UserDoc>("users");
}
