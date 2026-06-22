import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "Scaffold";

if (!uri) {
  throw new Error("MONGODB_URI is missing in .env file.");
}

export const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const database = mongoClient.db(dbName);

export const collections = {
  users: database.collection("user"),
  donationRequests: database.collection("donationRequests"),
  fundings: database.collection("fundings"),
};

export const connectDB = async () => {
  await mongoClient.connect();
  await database.command({ ping: 1 });
  console.log(`Pinged MongoDB. Connected to database: ${dbName}`);
};