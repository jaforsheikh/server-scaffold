import express from "express";
import { ObjectId } from "mongodb";
import { collections } from "../db.js";
import {
  verifyActive,
  verifySession,
  verifyVolunteerOrAdmin,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

const allowedBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const allowedStatuses = ["pending", "inprogress", "done", "canceled"];

const getRequestQuery = (id) => {
  const queries = [{ id }];

  if (ObjectId.isValid(id)) {
    queries.push({ _id: new ObjectId(id) });
  }

  return { $or: queries };
};

const createRequestId = () => {
  return `REQ-${Date.now()}`;
};

const isOwner = (request, user) => {
  return request?.requesterEmail === user?.email || request?.requesterId === user?.id;
};

const cleanRequestUpdate = (body) => {
  const allowedFields = [
    "recipientName",
    "recipientDistrict",
    "recipientUpazila",
    "district",
    "upazila",
    "hospitalName",
    "fullAddress",
    "bloodGroup",
    "donationDate",
    "donationTime",
    "requestMessage",
  ];

  const updateDoc = {};

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      updateDoc[field] = body[field];
    }
  });

  if (updateDoc.recipientDistrict && !updateDoc.district) {
    updateDoc.district = updateDoc.recipientDistrict;
  }

  if (updateDoc.recipientUpazila && !updateDoc.upazila) {
    updateDoc.upazila = updateDoc.recipientUpazila;
  }

  return updateDoc;
};

const validateRequestPayload = (body) => {
  const requiredFields = [
    "recipientName",
    "recipientDistrict",
    "recipientUpazila",
    "hospitalName",
    "fullAddress",
    "bloodGroup",
    "donationDate",
    "donationTime",
    "requestMessage",
  ];

  const missingField = requiredFields.find((field) => !body[field]);

  if (missingField) {
    return `${missingField} is required.`;
  }

  if (!allowedBloodGroups.includes(body.bloodGroup)) {
    return "Invalid blood group.";
  }

  return null;
};

router.post("/", verifySession, verifyActive, async (req, res) => {
  const validationError = validateRequestPayload(req.body);

  if (validationError) {
    return res.status(400).send({
      success: false,
      message: validationError,
    });
  }

  const now = new Date();

  const donationRequest = {
    id: createRequestId(),
    requesterId: req.user.id,
    requesterName: req.user.name || req.user.displayName || "",
    requesterEmail: req.user.email,
    recipientName: req.body.recipientName,
    recipientDistrict: req.body.recipientDistrict,
    recipientUpazila: req.body.recipientUpazila,
    district: req.body.recipientDistrict,
    upazila: req.body.recipientUpazila,
    hospitalName: req.body.hospitalName,
    fullAddress: req.body.fullAddress,
    bloodGroup: req.body.bloodGroup,
    donationDate: req.body.donationDate,
    donationTime: req.body.donationTime,
    requestMessage: req.body.requestMessage,
    status: "pending",
    donorName: "",
    donorEmail: "",
    createdAt: now,
    updatedAt: now,
  };

  const result = await collections.donationRequests.insertOne(donationRequest);

  res.status(201).send({
    success: true,
    message: "Donation request created successfully.",
    insertedId: result.insertedId,
    donationRequest,
  });
});

router.get("/public", async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 50);

  const filter = {
    status: "pending",
  };

  const total = await collections.donationRequests.countDocuments(filter);

  const requests = await collections.donationRequests
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
    requests,
  });
});

router.get("/my", verifySession, async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const status = req.query.status;

  const filter = {
    requesterEmail: req.user.email,
  };

  if (status && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  const total = await collections.donationRequests.countDocuments(filter);

  const requests = await collections.donationRequests
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
    requests,
  });
});

router.get("/all", verifySession, verifyVolunteerOrAdmin, async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const status = req.query.status;

  const filter = {};

  if (status && allowedStatuses.includes(status)) {
    filter.status = status;
  }

  const total = await collections.donationRequests.countDocuments(filter);

  const requests = await collections.donationRequests
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
    requests,
  });
});

router.get("/:id", verifySession, async (req, res) => {
  const request = await collections.donationRequests.findOne(
    getRequestQuery(req.params.id)
  );

  if (!request) {
    return res.status(404).send({
      success: false,
      message: "Donation request not found.",
    });
  }

  res.send({
    success: true,
    request,
  });
});

router.patch("/:id", verifySession, async (req, res) => {
  const request = await collections.donationRequests.findOne(
    getRequestQuery(req.params.id)
  );

  if (!request) {
    return res.status(404).send({
      success: false,
      message: "Donation request not found.",
    });
  }

  if (!isOwner(request, req.user) && req.user.role !== "admin") {
    return res.status(403).send({
      success: false,
      message: "Only request owner or admin can update this request.",
    });
  }

  const updateDoc = cleanRequestUpdate(req.body);

  if (updateDoc.bloodGroup && !allowedBloodGroups.includes(updateDoc.bloodGroup)) {
    return res.status(400).send({
      success: false,
      message: "Invalid blood group.",
    });
  }

  if (Object.keys(updateDoc).length === 0) {
    return res.status(400).send({
      success: false,
      message: "No valid update field provided.",
    });
  }

  updateDoc.updatedAt = new Date();

  const result = await collections.donationRequests.updateOne(
    getRequestQuery(req.params.id),
    {
      $set: updateDoc,
    }
  );

  res.send({
    success: true,
    message: "Donation request updated successfully.",
    result,
  });
});

router.patch("/:id/donate", verifySession, async (req, res) => {
  const request = await collections.donationRequests.findOne(
    getRequestQuery(req.params.id)
  );

  if (!request) {
    return res.status(404).send({
      success: false,
      message: "Donation request not found.",
    });
  }

  if (request.status !== "pending") {
    return res.status(400).send({
      success: false,
      message: "Only pending request can be moved to inprogress.",
    });
  }

  const result = await collections.donationRequests.updateOne(
    getRequestQuery(req.params.id),
    {
      $set: {
        status: "inprogress",
        donorName: req.user.name || "",
        donorEmail: req.user.email,
        donorId: req.user.id,
        updatedAt: new Date(),
      },
    }
  );

  res.send({
    success: true,
    message: "Donation confirmed successfully.",
    result,
  });
});

router.patch("/:id/status", verifySession, async (req, res) => {
  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).send({
      success: false,
      message: "Invalid donation request status.",
    });
  }

  const request = await collections.donationRequests.findOne(
    getRequestQuery(req.params.id)
  );

  if (!request) {
    return res.status(404).send({
      success: false,
      message: "Donation request not found.",
    });
  }

  const userIsOwner = isOwner(request, req.user);
  const userIsAdmin = req.user.role === "admin";
  const userIsVolunteer = req.user.role === "volunteer";

  if (!userIsOwner && !userIsAdmin && !userIsVolunteer) {
    return res.status(403).send({
      success: false,
      message: "You are not allowed to update this status.",
    });
  }

  if (userIsOwner && !userIsAdmin && !userIsVolunteer) {
    const allowedOwnerStatuses = ["done", "canceled"];

    if (request.status !== "inprogress" || !allowedOwnerStatuses.includes(status)) {
      return res.status(403).send({
        success: false,
        message: "Owner can only change inprogress request to done or canceled.",
      });
    }
  }

  const result = await collections.donationRequests.updateOne(
    getRequestQuery(req.params.id),
    {
      $set: {
        status,
        updatedAt: new Date(),
      },
    }
  );

  res.send({
    success: true,
    message: `Donation request status updated to ${status}.`,
    result,
  });
});

router.delete("/:id", verifySession, async (req, res) => {
  const request = await collections.donationRequests.findOne(
    getRequestQuery(req.params.id)
  );

  if (!request) {
    return res.status(404).send({
      success: false,
      message: "Donation request not found.",
    });
  }

  if (!isOwner(request, req.user) && req.user.role !== "admin") {
    return res.status(403).send({
      success: false,
      message: "Only request owner or admin can delete this request.",
    });
  }

  const result = await collections.donationRequests.deleteOne(
    getRequestQuery(req.params.id)
  );

  res.send({
    success: true,
    message: "Donation request deleted successfully.",
    result,
  });
});

export default router;