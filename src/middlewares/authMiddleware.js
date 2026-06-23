import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { collections } from "../db.js";

const getUserQuery = (decodedUser) => {
  const queries = [];

  if (decodedUser?.id) {
    queries.push({ id: decodedUser.id });

    if (ObjectId.isValid(decodedUser.id)) {
      queries.push({ _id: new ObjectId(decodedUser.id) });
    }
  }

  if (decodedUser?.email) {
    queries.push({ email: decodedUser.email });
  }

  return { $or: queries };
};

export const verifyJWT = async (req, res, next) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).send({
        success: false,
        message: "JWT_SECRET is missing in environment variables.",
      });
    }

    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized. JWT token is missing.",
      });
    }

    const token = authorization.split(" ")[1];
    const decodedUser = jwt.verify(token, jwtSecret);

    const user = await collections.users.findOne(getUserQuery(decodedUser));

    if (!user) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized. User not found for this token.",
      });
    }

    req.jwtUser = decodedUser;
    req.user = {
      ...user,
      id: user.id || String(user._id),
      role: user.role || "donor",
      status: user.status || "active",
    };

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized. Invalid or expired JWT token.",
      error: error.message,
    });
  }
};

export const verifySession = verifyJWT;

export const verifyActive = (req, res, next) => {
  if (req.user?.status === "blocked") {
    return res.status(403).send({
      success: false,
      message: "Forbidden. Blocked users cannot perform this action.",
    });
  }

  next();
};

export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).send({
      success: false,
      message: "Forbidden. Admin access required.",
    });
  }

  next();
};

export const verifyVolunteerOrAdmin = (req, res, next) => {
  const role = req.user?.role;

  if (role !== "admin" && role !== "volunteer") {
    return res.status(403).send({
      success: false,
      message: "Forbidden. Volunteer or admin access required.",
    });
  }

  next();
};