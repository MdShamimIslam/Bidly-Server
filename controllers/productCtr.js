import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";
import BiddingProduct from "../models/biddingModel.js";
import slugify from "slugify";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// create product
export const createProduct = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    category,
    height,
    lengthpic,
    width,
    mediumused,
    weigth,
  } = req.body;

  const userId = req.user.id;

  const originalSlug = slugify(title, {
    lower: true,
    remove: /[*+~.()'"!:@]/g,
    strict: true,
  });

  let slug = originalSlug;
  let suffix = 1;

  while (await Product.findOne({ slug })) {
    slug = `${originalSlug}-${suffix}`;
    suffix++;
  }

  if (!title || !description || !price) {
    res.status(400);
    throw new Error("Please fill in all fields");
  }

  let fileData = {};
  if (req.file) {
    let uploadedFile;
    try {
      uploadedFile = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "Bidding/Product",
        resource_type: "image",
      });
    } catch (error) {
      res.status(500);
      throw new Error("Image could not be uploaded");
    }

    fileData = {
      fileName: req.file.originalname,
      filePath: uploadedFile.secure_url,
      fileType: req.file.mimetype,
      public_id: uploadedFile.public_id,
    };
  }

  const product = await Product.create({
    user: userId,
    title,
    slug,
    description,
    price,
    category,
    height,
    lengthpic,
    width,
    mediumused,
    weigth,
    image: fileData,
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

// get all produc
export const getAllProduct = asyncHandler(async (req, res) => {
  const { page, limit, title } = req.query;

  const query = title
    ? { title: { $regex: title, $options: "i" } } 
    : {};

  const totalProducts = await Product.countDocuments(query);

  const skip = page && limit ? (page - 1) * limit : 0;
  const paginationLimit = limit ? parseInt(limit) : 0;

  const products = await Product.find(query)
    .sort("-createdAt")
    .populate("user")
    .skip(skip)
    .limit(paginationLimit);

  const productsWithDetails = await Promise.all(
    products.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;

      const totalBids = await BiddingProduct.countDocuments({ product: product._id });

      return {
        ...product._doc,
        biddingPrice,
        totalBids,
      };
    })
  );

  if (page && limit) {
    return res.status(200).json({
      products: productsWithDetails,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: Number(page),
    });
  }

  // Response for non-paginated request
  res.status(200).json({ products: productsWithDetails});
});

// delete product
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.user?.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }

  if (product.image && product.image.public_id) {
    try {
      await cloudinary.uploader.destroy(product.image.public_id);
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
    }
  }

  await Product.findByIdAndDelete(id);
  res.status(200).json({ message: "Product deleted successfully." });
});

// update product
export const updateProduct = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    price,
    height,
    lengthpic,
    width,
    mediumused,
    weigth,
  } = req.body;
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }

  let fileData = {};
  if (req.file) {
    let uploadedFile;
    try {
      uploadedFile = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "Bidding/Product",
        resource_type: "image",
      });
    } catch (error) {
      res.status(500);
      throw new Error("Image colud not be uploaded");
    }

    if (product.image && product.image.public_id) {
      try {
        await cloudinary.v2.uploader.destroy(product.image.public_id);
      } catch (error) {
        console.error("Error deleting previous image from Cloudinary:", error);
      }
    }

    fileData = {
      fileName: req.file.originalname,
      filePath: uploadedFile.secure_url,
      fileType: req.file.mimetype,
      public_id: uploadedFile.public_id,
    };
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: id },
    {
      title,
      description,
      price,
      height,
      lengthpic,
      width,
      mediumused,
      weigth,
      image: Object.keys(fileData).length === 0 ? Product?.image : fileData,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json(updatedProduct);
});

// get all products of  user
export const getAllProductsofUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const products = await Product.find({ user: userId })
    .sort("-createdAt")
    .populate("user");

  const productsWithPrices = await Promise.all(
    products.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;
      return {
        ...product._doc,
        biddingPrice,
      };
    })
  );

  res.status(200).json(productsWithPrices);
});

// get won products
export const getWonProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const wonProducts = await Product.find({ soldTo: userId }).sort("-createdAt").populate("user");

  const productsWithPrices = await Promise.all(
    wonProducts.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;
      return {
        ...product._doc,
        biddingPrice, // Adding the price field
      };
    })
  );

  res.status(200).json(productsWithPrices);
});

// get product by id
export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate("user");
  
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.status(200).json(product);
});

// get all sold products
export const getAllSoldProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isSoldout: true })
    .sort("-createdAt")
    .populate("user");
  res.status(200).json(products);
});

// verify And Add Commission Product By Amdin
export const verifyAndAddCommissionProductByAmdin = asyncHandler(
  async (req, res) => {
    const  {commission}  = req.body;
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    product.isverify = true;
    product.commission = parseFloat(commission);

    await product.save();

    res
      .status(200)
      .json({ message: "Product verified successfully", data: product });
  }
);

// delete products by admin
export const deleteProductsByAmdin = asyncHandler(async (req, res) => {
  try {
    const productId  = req?.params?.id;

    await Product.findOneAndDelete({ _id: productId });

    res.status(200).json({ message: 'deleted successfully' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

