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

/**
 * Public donor search API
 * GET /api/users/search-donors?bloodGroup=A%2B&district=Dhaka&upazila=Dhanmondi
 */
router.get("/search-donors", async (req, res) => {
  try {
    const { bloodGroup, district, upazila } = req.query;

    if (!bloodGroup || !district || !upazila) {
      return res.status(400).send({
        success: false,
        message: "Blood group, district and upazila are required.",
      });
    }

    const donors = await collections.users
      .find({
        bloodGroup,
        district,
        upazila,
        status: "active",
        role: { $in: ["donor", "volunteer", "admin"] },
      })
      .project({
        email: 1,
        name: 1,
        avatar: 1,
        image: 1,
        bloodGroup: 1,
        district: 1,
        upazila: 1,
        role: 1,
        status: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.send({
      success: true,
      total: donors.length,
      donors: donors.map(cleanUser),
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to search donors.",
      error: error.message,
    });
  }
});

/**
 * Logged in user profile
 * GET /api/users/me
 */
router.get("/me", verifySession, async (req, res) => {
  try {
    res.send({
      success: true,
      user: cleanUser(req.user),
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to load profile.",
      error: error.message,
    });
  }
});

/**
 * Update own profile
 * PATCH /api/users/me
 */
router.patch("/me", verifySession, async (req, res) => {
  try {
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

    const result = await collections.users.updateOne(getUserQuery(req.user.id), {
      $set: updateDoc,
    });

    res.send({
      success: true,
      message: "Profile updated successfully.",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update profile.",
      error: error.message,
    });
  }
});

/**
 * Admin: get all users
 * GET /api/users?page=1&limit=10&status=active
 */
router.get("/", verifySession, verifyAdmin, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to load users.",
      error: error.message,
    });
  }
});

/**
 * Admin: update user status
 * PATCH /api/users/:id/status
 */
router.patch("/:id/status", verifySession, verifyAdmin, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update user status.",
      error: error.message,
    });
  }
});

/**
 * Admin: update user role
 * PATCH /api/users/:id/role
 */
router.patch("/:id/role", verifySession, verifyAdmin, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to update user role.",
      error: error.message,
    });
  }
});

export default router;