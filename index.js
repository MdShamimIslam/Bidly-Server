import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
const PORT = process.env.PORT || 5000;
import userRoute from "./routes/userRoute.js";
import productRoute from "./routes/productRoute.js";
import biddingRoute from "./routes/biddingRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import { errorHandler } from "./middlewares/errorMiddleWare.js";

const app = express();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());
app.use(
  cors(
    // TODO
    { origin: ["http://localhost:5174"], credentials: true}
  )
);

// router handlers
app.use("/api/users", userRoute);
app.use("/api/product", productRoute);
app.use("/api/bidding", biddingRoute);
app.use("/api/category", categoryRoute);


// Manually define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// error handlers middlewares
app.use(errorHandler);

// connect database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_CLOUD);
  } catch (error) {
  }
};

await  connectDB();

// routes
app.get("/", (req, res) => {
  res.send("bidxpress Server is running");
});
app.listen(PORT, () => {
    console.log(`bidxpress server is running on port ${PORT}`);
  });