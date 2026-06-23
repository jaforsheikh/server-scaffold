import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "Scaffold";

if (!uri) {
  throw new Error("MONGODB_URI is missing in environment variables.");
}

let cachedClient = globalThis._mongoClient;
let cachedClientPromise = globalThis._mongoClientPromise;

if (!cachedClientPromise) {
  cachedClient = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  cachedClientPromise = cachedClient.connect();

  globalThis._mongoClient = cachedClient;
  globalThis._mongoClientPromise = cachedClientPromise;
}

export const mongoClient = cachedClient;
export const mongoClientPromise = cachedClientPromise;
export const database = mongoClient.db(dbName);

export const collections = {
  users: database.collection("user"),
  accounts: database.collection("account"),
  sessions: database.collection("session"),
  donationRequests: database.collection("donationRequests"),
  fundings: database.collection("fundings"),
};

export const connectDB = async () => {
  await mongoClientPromise;
  await database.command({ ping: 1 });
  console.log(`Pinged MongoDB. Connected to database: ${dbName}`);
};