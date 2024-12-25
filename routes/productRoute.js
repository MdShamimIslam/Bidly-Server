import express from "express";
import {
  createProduct,
  getAllProducts,
  deleteProduct,
  updateProduct,
  getAllProductsofUser,
  verifyAndAddCommissionProductByAmdin,
  getAllProductsByAmdin,
  deleteProductsByAmdin,
  getProduct,
  getAllSoldProducts,
  getWonProducts
} from "../controllers/productCtr.js";
import { isSeller, protect, isAdmin } from "../middlewares/authMiddleWare.js";
import { upload } from "../utils/fileUpload.js";
const router = express.Router();

router.post("/", protect, isSeller, upload.single("image"), createProduct);
router.get("/", getAllProducts);
router.get("/sold", getAllSoldProducts);
router.get("/won-products", protect, getWonProducts);
router.get("/user", protect, getAllProductsofUser);

router.get("/:id", getProduct);
router.delete("/:id", protect, deleteProduct);
router.put("/:id", protect, isSeller, upload.single("image"), updateProduct);
// Only access for admin users
router.patch("/admin/product-verified/:id", protect, isAdmin, verifyAndAddCommissionProductByAmdin);
router.get("/admin/products", protect, isAdmin, getAllProductsByAmdin);
router.delete("/admin/products/:id", protect, isAdmin, deleteProductsByAmdin);

export default router;
