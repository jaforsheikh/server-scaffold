import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { collections } from "../db.js";

const router = express.Router();

const parseCookies = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const [name, ...rest] = cookie.split("=");
      cookies[name] = decodeURIComponent(rest.join("="));
      return cookies;
    }, {});
};

const getCookieTokenCandidates = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  const values = Object.values(cookies);

  const candidates = [];

  values.forEach((value) => {
    if (!value) return;

    candidates.push(value);

    if (value.includes(".")) {
      candidates.push(value.split(".")[0]);
    }
  });

  return [...new Set(candidates)].filter((token) => token.length > 10);
};

const findUserFromBetterAuthCookie = async (req) => {
  const tokenCandidates = getCookieTokenCandidates(req);

  if (tokenCandidates.length === 0) {
    return null;
  }

  const sessionDoc = await collections.sessions.findOne({
    token: { $in: tokenCandidates },
  });

  if (!sessionDoc?.userId) {
    return null;
  }

  const userId = String(sessionDoc.userId);

  const userQueries = [{ id: userId }];

  if (ObjectId.isValid(userId)) {
    userQueries.push({ _id: new ObjectId(userId) });
  }

  const user = await collections.users.findOne({
    $or: userQueries,
  });

  return user;
};

router.post("/", async (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).send({
        success: false,
        message: "JWT_SECRET is missing in environment variables.",
      });
    }

    let sessionUser = null;

    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      sessionUser = session?.user || null;
    } catch {
      sessionUser = null;
    }

    let user = sessionUser;

    if (!user?.email) {
      user = await findUserFromBetterAuthCookie(req);
    }

    if (!user?.email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized. Login required before issuing JWT.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id || String(user._id),
        email: user.email,
        role: user.role || "donor",
        status: user.status || "active",
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