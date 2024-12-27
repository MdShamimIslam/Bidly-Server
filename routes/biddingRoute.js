
import express from "express";
import {  placeBid, getBiddingHistory, sellProduct } from "../controllers/biddingCtr.js";
import { protect, isSeller } from "../middlewares/authMiddleWare.js";
const router = express.Router();

router.post("/", protect, placeBid);
router.get("/:productId", getBiddingHistory);
router.post("/sell", protect, isSeller, sellProduct);

export default router;