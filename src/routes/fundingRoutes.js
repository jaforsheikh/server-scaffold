import express from "express";
import Stripe from "stripe";
import { collections } from "../db.js";
import { verifySession } from "../middlewares/authMiddleware.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.get("/", verifySession, async (req, res) => {
  const fundings = await collections.fundings
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const totalFunding = fundings.reduce(
    (sum, fund) => sum + Number(fund.amount || 0),
    0
  );

  res.send({
    success: true,
    totalFunding,
    fundings,
  });
});

router.post("/create-payment-intent", verifySession, async (req, res) => {
  const { amount } = req.body;
  const paymentAmount = Number(amount);

  if (!paymentAmount || paymentAmount < 1) {
    return res.status(400).send({
      success: false,
      message: "Minimum funding amount is $1.",
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(paymentAmount * 100),
    currency: "usd",
    payment_method_types: ["card"],
    metadata: {
      userId: req.user?.id || "",
      userName: req.user?.name || "",
      userEmail: req.user?.email || "",
    },
  });

  res.send({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

router.post("/", verifySession, async (req, res) => {
  const { amount, transactionId } = req.body;
  const fundingAmount = Number(amount);

  if (!fundingAmount || fundingAmount < 1 || !transactionId) {
    return res.status(400).send({
      success: false,
      message: "Valid amount and transaction ID are required.",
    });
  }

  const existingFunding = await collections.fundings.findOne({
    transactionId,
  });

  if (existingFunding) {
    return res.status(409).send({
      success: false,
      message: "This transaction is already saved.",
    });
  }

  const fundingDoc = {
    userId: req.user?.id || req.user?._id || "",
    name: req.user?.name || "Unknown User",
    email: req.user?.email || "",
    amount: fundingAmount,
    currency: "usd",
    transactionId,
    createdAt: new Date(),
  };

  const result = await collections.fundings.insertOne(fundingDoc);

  res.send({
    success: true,
    message: "Funding saved successfully.",
    insertedId: result.insertedId,
    funding: fundingDoc,
  });
});

export default router;