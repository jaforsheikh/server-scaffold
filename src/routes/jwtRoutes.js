import express from "express";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).send({
        success: false,
        message: "JWT_SECRET is missing in environment variables.",
      });
    }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized. Login required before issuing JWT.",
      });
    }

    const token = jwt.sign(
      {
        id: session.user.id,
        email: session.user.email,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    res.send({
      success: true,
      token,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to issue JWT token.",
      error: error.message,
    });
  }
});

export default router;