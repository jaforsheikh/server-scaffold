import express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../db.js";
import { verifyAdmin, verifySession } from "../middlewares/authMiddleware.js";

const router = express.Router();

const allowedRoles = ["donor", "volunteer", "admin"];
const allowedStatuses = ["active", "blocked"];

const getUserQuery = (id) => {
  const queries = [{ id }];

  if (ObjectId.isValid(id)) {
    queries.push({ _id: new ObjectId(id) });
  }

  return { $or: queries };
};

const cleanUser = (user) => {
  if (!user) return null;

  const { password, hashedPassword, ...safeUser } = user;
  return safeUser;
};

router.get("/me", verifySession, async (req, res) => {
  res.send({
    success: true,
    user: cleanUser(req.user),
  });
});

router.patch("/me", verifySession, async (req, res) => {
  const allowedFields = [
    "name",
    "avatar",
    "image",
    "bloodGroup",
    "district",
    "upazila",
  ];

  const updateDoc = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateDoc[field] = req.body[field];
    }
  });

  if (Object.keys(updateDoc).length === 0) {
    return res.status(400).send({
      success: false,
      message: "No valid profile field provided.",
    });
  }

  updateDoc.updatedAt = new Date();

  const result = await collections.users.updateOne(
    getUserQuery(req.user.id),
    {
      $set: updateDoc,
    }
  );

  res.send({
    success: true,
    message: "Profile updated successfully.",
    result,
  });
});

router.get("/", verifySession, verifyAdmin, async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const status = req.query.status;

  const filter = {};

  if (status && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  const total = await collections.users.countDocuments(filter);

  const users = await collections.users
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  res.send({
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    users: users.map(cleanUser),
  });
});

router.patch("/:id/status", verifySession, verifyAdmin, async (req, res) => {
  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).send({
      success: false,
      message: "Invalid user status.",
    });
  }

  const result = await collections.users.updateOne(getUserQuery(req.params.id), {
    $set: {
      status,
      updatedAt: new Date(),
    },
  });

  res.send({
    success: true,
    message: `User status updated to ${status}.`,
    result,
  });
});

router.patch("/:id/role", verifySession, verifyAdmin, async (req, res) => {
  const { role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).send({
      success: false,
      message: "Invalid user role.",
    });
  }

  const result = await collections.users.updateOne(getUserQuery(req.params.id), {
    $set: {
      role,
      updatedAt: new Date(),
    },
  });

  res.send({
    success: true,
    message: `User role updated to ${role}.`,
    result,
  });
});

export default router;