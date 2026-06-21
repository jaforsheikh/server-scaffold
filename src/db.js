import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "Scaffold";

if (!uri) {
  throw new Error("MONGODB_URI is missing in environment variables.");
}

export const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const database = mongoClient.db(dbName);

export const connectDB = async () => {
  await mongoClient.connect();
  await database.command({ ping: 1 });
  console.log(`MongoDB connected: ${dbName}`);
};