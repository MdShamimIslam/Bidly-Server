import asyncHandler from "express-async-handler";
import BiddingProduct from "../models/biddingModel.js";
import Product from "../models/productModel.js";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/sendEmail.js";

// adding bid in product for bidddingProduct
export const placeBid = asyncHandler(async (req, res) => {
  const { productId, price } = req.body;
  const userId = req.user.id;

  const product = await Product.findById(productId);
  if (!product.isverify) {
    res.status(400);
    throw new Error("Bidding is not verified for these products.");
  }

  if (!product || product.isSoldout === true) {
    res.status(400);
    throw new Error("Invalid product or bidding is closed");
  }

  const existingUserBid = await BiddingProduct.findOne({
    user: userId,
    product: productId,
  });

  if (existingUserBid) {
    if (price <= existingUserBid.price) {
      res.status(400);
      throw new Error("Your bid must be higher than your previous bid");
    }
    existingUserBid.price = price;
    await existingUserBid.save();
    res.status(200).json(existingUserBid);
  } else {
    const highestBidProduct = await BiddingProduct.findOne({
      product: productId,
    }).sort({ price: -1 });

    if (highestBidProduct && price <= highestBidProduct.price) {
      res.status(400);
      throw new Error("Your bid must be higher than the current highest bid");
    }

    const biddingProduct = await BiddingProduct.create({
      user: userId,
      product: productId,
      price,
    });

    res.status(201).json(biddingProduct);
  }
});

// get bidding history
export const getBiddingHistory = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const biddingHistory = await BiddingProduct.find({ product: productId })
    .sort("-createdAt")
    .populate("user")
    .populate("product");

  res.status(200).json(biddingHistory);
});

// sell the product
export const sellProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Check if the user is authorized to sell the product
  if (product.user.toString() !== userId) {
    return res
      .status(403)
      .json({ error: "You do not have permission to sell this product" });
  }
  // Find the highest bid
  const highestBid = await BiddingProduct.findOne({ product: productId })
    .sort({ price: -1 })
    .populate("user");

  if (!highestBid) {
    return res
      .status(400)
      .json({ message: "No winning bid found for the product." });
  }

  // Calculate commission and final price
  const commissionRate = product.commission;
  const commissionAmount = (commissionRate / 100) * highestBid.price;
  const finalPrice = highestBid.price - commissionAmount;

  // Update product details
  product.isSoldout = true;
  product.soldTo = highestBid.user;
  product.soldPrice = finalPrice;

  // Update admin's commission balance
  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    admin.commissionBalance += commissionAmount;
    await admin.save();
  }

  // Update seller's balance
  const seller = await User.findById(product.user);
  if (seller) {
    seller.balance += finalPrice;
    await seller.save();
  } else {
    return res.status(404).json({ error: "Seller not found" });
  }

  // Save product
  await product.save();

  //   Send email notification to the highest bidder
  await sendEmail({
    email: highestBid.user.email,
    subject: "Congratulations! You won the auction!",
    text: `You have won the auction for "${product.title}" with a bid of $${highestBid.price}.`,
  });

  res.status(200).json({ message: "Product has been successfully sold!" });
});
