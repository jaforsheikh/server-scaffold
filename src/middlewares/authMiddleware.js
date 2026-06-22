import { ObjectId } from "mongodb";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { collections } from "../db.js";

const getUserQuery = (id) => {
  const queries = [{ id }];

  if (ObjectId.isValid(id)) {
    queries.push({ _id: new ObjectId(id) });
  }

  return { $or: queries };
};

export const verifySession = async (req, res, next) => {
  try {
    const authSession = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!authSession?.user?.email) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const sessionUser = authSession.user;

    const dbUser =
      (await collections.users.findOne(getUserQuery(sessionUser.id))) ||
      (await collections.users.findOne({ email: sessionUser.email }));

    req.authSession = authSession;
    req.user = {
      ...sessionUser,
      ...dbUser,
      id: dbUser?.id || sessionUser.id,
      email: dbUser?.email || sessionUser.email,
      name: dbUser?.name || sessionUser.name || "",
      avatar: dbUser?.avatar || dbUser?.image || sessionUser.avatar || "",
      image: dbUser?.image || dbUser?.avatar || sessionUser.image || "",
      role: dbUser?.role || sessionUser.role || "donor",
      status: dbUser?.status || sessionUser.status || "active",
    };

    next();
  } catch (error) {
    res.status(401).send({
      success: false,
      message: "Authentication failed.",
      error: error.message,
    });
  }
};

export const verifyActive = (req, res, next) => {
  if (req.user?.status === "blocked") {
    return res.status(403).send({
      success: false,
      message: "Blocked users cannot perform this action.",
    });
  }

  next();
};

export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).send({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
};

export const verifyVolunteerOrAdmin = (req, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "volunteer") {
    return res.status(403).send({
      success: false,
      message: "Volunteer or admin access required.",
    });
  }

  next();
};