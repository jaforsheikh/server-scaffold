import "dotenv/config";
import express from "express";
import cors from "cors";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { connectDB } from "./db.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

const port = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://client-scaffold-six.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

let dbReady = false;

const ensureDB = async () => {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }
};

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Database connection failed.",
      error: error.message,
    });
  }
});

app.all("/api/auth/{*path}", toNodeHandler(auth));

app.use(express.json());

app.get("/", (req, res) => {
  res.send({
    success: true,
    message: "Scaffold backend server is running.",
  });
});

app.get("/health", (req, res) => {
  res.send({
    success: true,
    message: "Server health check passed.",
  });
});

app.get("/api/auth-session", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    res.send({
      success: true,
      authenticated: Boolean(session?.user),
      session,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to read Better Auth session.",
      error: error.message,
    });
  }
});

app.use("/api/users", userRoutes);

app.use((req, res) => {
  res.status(404).send({
    success: false,
    message: "API route not found.",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Scaffold server running on port ${port}`);
  });
}

export default app;