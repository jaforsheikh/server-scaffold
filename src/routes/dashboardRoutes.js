import express from "express";
import { collections } from "../db.js";
import { verifySession } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/summary", verifySession, async (req, res) => {
  const userRole = req.user?.role || "donor";
  const userEmail = req.user?.email || "";
  const userId = req.user?.id || req.user?._id || "";

  const responseData = {
    success: true,
    role: userRole,
    stats: {
      totalUsers: 0,
      totalDonors: 0,
      totalRequests: 0,
      totalFunding: 0,
    },
    recentRequests: [],
  };

  if (userRole === "admin" || userRole === "volunteer") {
    const [totalUsers, totalDonors, totalRequests, fundings] =
      await Promise.all([
        collections.users.countDocuments(),
        collections.users.countDocuments({
          role: { $in: ["donor", "volunteer", "admin"] },
        }),
        collections.donationRequests.countDocuments(),
        collections.fundings.find({}).toArray(),
      ]);

    const totalFunding = fundings.reduce(
      (sum, fund) => sum + Number(fund.amount || 0),
      0
    );

    responseData.stats = {
      totalUsers,
      totalDonors,
      totalRequests,
      totalFunding,
    };

    return res.send(responseData);
  }

  const recentRequests = await collections.donationRequests
    .find({
      $or: [{ requesterEmail: userEmail }, { requesterId: userId }],
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();

  responseData.recentRequests = recentRequests;

  res.send(responseData);
});

export default router;