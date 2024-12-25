import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// register user
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fileds");
  }

  const userExits = await User.findOne({ email });
  if (userExits) {
    res.status(400);
    throw new Error("Email is already exit");
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const token = generateToken(user._id);

  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400),
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const { _id, name, email, photo, role } = user;
    res.status(201).json({ _id, name, email, photo, token, role });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// login user
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please add Email and Password");
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, Please signUp");
  }

  const passwordIsCorrrect = await bcrypt.compare(password, user.password);

  const token = generateToken(user._id);
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400),
    sameSite: "none",
    secure: true,
  });

  if (user && passwordIsCorrrect) {
    const { _id, name, email, photo, role } = user;
    res.status(201).json({ _id, name, email, photo, role, token });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

// user login status
export const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

// user loged out
export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Successfully Logged Out" });
});

// login as seller from buyer
export const loginAsSeller = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide both email and password");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, please sign up");
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.password);
  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  user.role = "seller";
  await user.save();

  const token = generateToken(user._id);
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400),
    sameSite: "none",
    secure: true,
  });

  const { _id, name, email: userEmail, photo, role } = user;
  res.status(200).json({ _id, name, email: userEmail, photo, role, token });
});

// get single user
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.status(200).json(user);
});

// update user
export const updateUser = asyncHandler(async (req, res) => {
  const updateName  = req.body.name;
  const userId = req.user.id;

  if (!updateName) {
    res.status(400);
    throw new Error("Name is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  let fileData = user?.photo || {};
  if (req.file) {
    try {
      if (fileData.public_id) {
        await cloudinary.v2.uploader.destroy(fileData.public_id);
      }

      const uploadedFile = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "Bidding/Profile",
        resource_type: "image",
      });

      fileData = {
        fileName: req.file.originalname,
        filePath: uploadedFile.secure_url,
        fileType: req.file.mimetype,
        public_id: uploadedFile.public_id,
      };
    } catch (error) {
      res.status(500);
      throw new Error("Photo upload failed");
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    { _id: userId },
    {
      name:updateName,
      photo: fileData?.filePath,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json(updatedUser);
});

// get user balance
export const getUserBalance = asyncHandler(async (req, res) => {
  const id = req.user.id;
  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    balance: user.balance,
  });
});

// get all users (only access for admin)
export const getAllUser = asyncHandler(async (req, res) => {
  const userList = await User.find({});

  if (!userList.length) {
    return res.status(404).json({ message: "No user found" });
  }

  res.status(200).json(userList);
});

// get admin commision income
export const estimateIncome = asyncHandler(async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ error: "Admin user not found" });
    }
    const commissionBalance = admin.commissionBalance;
    res.status(200).json({ commissionBalance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// delete user by admin
export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  try {
    const id = req?.params?.id;

    await User.findOneAndDelete({ _id: id });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
