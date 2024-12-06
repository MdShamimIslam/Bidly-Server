
import express from "express";
import { createCategory, getAllCategory, getCategory, updateCategory, deleteCategory } from "../controllers/categoryCtr.js";
import { protect, isAdmin } from "../middlewares/authMiddleWare.js";
const router = express.Router();

router.post("/", protect, isAdmin, createCategory);
router.get("/", getAllCategory);
router.get("/:id", protect, isAdmin, getCategory);
router.put("/:id", protect, isAdmin, updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);

export default router;