import express from "express";
import {
  loginStatus,
  loginUser,
  logoutUser,
  registerUser,
  loginAsSeller,
  getUser,
  updateUser,
  getUserBalance,
  addFavouriteProduct,
  getFavouriteProducts,
  removeFavouriteProduct,
  getAllUser,
  estimateIncome,
  deleteUserByAdmin
} from "../controllers/userCtr.js";
import { protect, isAdmin } from "../middlewares/authMiddleWare.js";
import { upload } from "../utils/fileUpload.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/loggedin", loginStatus);
router.get("/logout", logoutUser);
router.post("/seller", loginAsSeller);
router.get("/getuser", protect, getUser);
router.put("/update-user-profile", protect, upload.single("photo"), updateUser);
router.get("/sell-amount", protect, getUserBalance);
router.post("/favourite-product/:productId", protect, addFavouriteProduct); 
router.get("/favourite-product", protect, getFavouriteProducts);
router.delete( "/favourite-product/:id", protect, removeFavouriteProduct );


router.get("/estimate-income", protect, isAdmin, estimateIncome); // only access for admin
router.get("/alluser", protect, isAdmin, getAllUser); // only access for admin
router.delete("/admin/delete-user/:id", protect, isAdmin, deleteUserByAdmin); // only access for admin

export default router;
