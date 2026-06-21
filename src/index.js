import "dotenv/config";
import express from "express";
import cors from "cors";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { connectDB } from "./db.js";

const app = express();

const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

/*
  Better Auth handler must be mounted before express.json().
  Express 5 needs named wildcard route syntax.
*/
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

app.use((req, res) => {
  res.status(404).send({
    success: false,
    message: "API route not found.",
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(port, () => {
      console.log(`Scaffold server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();