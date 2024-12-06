import express from "express";
import {
  loginStatus,
  loginUser,
  logoutUser,
  registerUser,
  loginAsSeller,
  getUser,
  getUserBalance,
  getAllUser,
  estimateIncome
} from "../controllers/userCtr.js";
import { protect, isAdmin } from "../middlewares/authMiddleWare.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/loggedin", loginStatus);
router.get("/logout", logoutUser);
router.post("/seller", loginAsSeller);
router.get("/getuser", protect, getUser);
router.get("/sell-amount", protect, getUserBalance);
router.get("/estimate-income", protect, isAdmin, estimateIncome); // only access for admin
router.get("/alluser", protect, isAdmin, getAllUser); // only access for admin

export default router;
