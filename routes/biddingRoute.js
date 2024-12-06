
import express from "express";
import { getBiddingHistory, placeBid, sellProduct } from "../controllers/biddingCtr.js";
import { protect, isSeller } from "../middlewares/authMiddleWare.js";
const router = express.Router();

router.get("/:productId", getBiddingHistory);
router.post("/", protect, placeBid);
router.post("/sell", protect, isSeller, sellProduct);

export default router;