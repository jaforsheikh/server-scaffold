import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { connectDB } from "./db.js";
import userRoutes from "./routes/userRoutes.js";
import donationRequestRoutes from "./routes/donationRequestRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import jwtRoutes from "./routes/jwtRoutes.js";

const app = express();

const port = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://client-scaffold-six.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error);

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
    message: "Scaffold Blood Donation Server is running.",
  });
});

app.get("/health", (req, res) => {
  res.send({
    success: true,
    message: "Server health check passed.",
  });
});

app.use("/api/jwt", jwtRoutes);
app.use("/api/users", userRoutes);
app.use("/api/donation-requests", donationRequestRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).send({
    success: false,
    message: "API route not found.",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;