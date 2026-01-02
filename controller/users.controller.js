const asyncWrapper = require("../middlewares/asyncWrapper");
const User = require("../models/user.model");
const appErrors = require("../utils/appErrors");
const { SUCCESS, FAIL } = require("../utils/httpStatusText");
const bcrypt = require("bcrypt");
const generateTokens = require("../utils/generateTokens");
const validator = require("validator");
const transport = require("../middlewares/sendEmail");
const hashing = require("../utils/hashing");

const getAllUsers = asyncWrapper(async (req, res) => {
  const query = req.query;
  const limit = parseInt(query.limit) || 10;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.role) filter.role = query.role.toUpperCase();

  const users = await User.find(filter)
    .select("-password -__v") // Exclude sensitive data
    .limit(limit)
    .skip(skip);

  const total = await User.countDocuments(filter);

  res.json({
    status: SUCCESS,
    data: {
      users,
      total,
      page,
      limit,
    },
  });
});

const getUserDetails = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    return res.status(404).json({
      status: FAIL,
      data: {
        message: "user not found",
      },
    });
  }

  res.json({ status: SUCCESS, data: { user } });
});

const register = asyncWrapper(async (req, res, next) => {
  const oldUser = await User.findOne({ email: req.body.email }).select(
    "+password"
  );
  if (oldUser) {
    const err = appErrors.create("user already exists", 400, FAIL);
    return next(err);
  }
  if (!validator.isStrongPassword(req.body.password)) {
    return next(appErrors.create("Weak password", 400, FAIL));
  }

  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const newUser = await User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email.toLowerCase().trim(),
    password: hashedPassword,
    role: req.body.role,
    avatar: req.file ? req.file.path : undefined,
  });

  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  const hashedCode = hashing(verificationCode);

  newUser.emailVerificationCode = hashedCode;
  newUser.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
  console.log("BEFORE SEND EMAIL");

  await transport.sendMail({
    from: process.env.EMAIL,
    to: newUser.email,
    subject: "Your Verification Code",
    html: `
      <h2>Email Verification</h2>
      <p>Your code is:</p>
      <h1>${verificationCode}</h1>
      <p>Expires in 10 minutes</p>
    `,
  });

  console.log("AFTER SEND EMAIL");
  await newUser.save();

  res.status(201).json({
    status: SUCCESS,
    message: "Registered successfully. Please verify your email.",
    data: {
      user: newUser,
    },
  });
});

const login = asyncWrapper(async (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    const err = appErrors.create("email and password are required", 400, FAIL);
    return next(err);
  }
  const user = await User.findOne({ email: req.body.email }).select(
    "+password"
  );
  if (!user) {
    const err = appErrors.create("Invalid email or password", 400, FAIL);
    return next(err);
  }
  if (!user.verified) {
    return next(
      appErrors.create("Please verify your email before logging in", 403, FAIL)
    );
  }

  const isMatched = await bcrypt.compare(req.body.password, user.password);
  if (!isMatched) {
    const err = appErrors.create("invalid email or password", 400, FAIL);
    return next(err);
  }
  const token = generateTokens({
    id: user._id.toString(),
    role: user.role,
  });
  res
    .cookie("Authorization", `Bearer ${token}`, {
      httpOnly: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 60 * 1000,
    })
    .status(200)
    .json({
      status: SUCCESS,
      data: {
        userId: user._id,
        accessToken: token,
      },
    });
});

const logout = asyncWrapper(async (req, res, next) => {
  res
    .clearCookie("Authorization")
    .status(200)
    .json({ status: SUCCESS, data: { message: "logout successfully" } });
});

// //email verification
const verifyEmailAfterRegister = asyncWrapper(async (req, res, next) => {
  const hashedCode = hashing(req.body.verificationCode);

  const user = await User.findOne({
    emailVerificationCode: hashedCode,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      appErrors.create("Invalid or expired verification link", 400, FAIL)
    );
  }
  const token = generateTokens({
    id: user._id.toString(),
    role: user.role,
  });

  user.verified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  res.status(200).json({
    status: SUCCESS,
    data: {
      message: "Email verified successfully.",
      accessToken: token,
    },
  });
});

// const sendVerificationEmail = asyncWrapper(async (req, res, next) => {
//   const user = await User.findById(req.currentUser.id);
//   if (!user) {
//     return res.status(200).json({
//       status: SUCCESS,
//       data: {
//         message: "If the email exists, a verification code has been sent",
//       },
//     });
//   }
//   if (user.verified) {
//     const err = appErrors.create("user already verified", 400, FAIL);
//     return next(err);
//   }
//   const verificationCode = Math.floor(100000 + Math.random() * 900000);
//   const hashedVerificationCode = hashing(verificationCode);

//   const mailOptions = {
//     from: process.env.EMAIL,
//     to: user.email,
//     subject: "Verification Code",
//     text: `Your verification code is ${verificationCode}`,
//   };
//   const result = await transport.sendMail(mailOptions);

//   user.verificationCode = hashedVerificationCode;
//   user.verificationCodeValidation = Date.now() + 60 * 60 * 1000;
//   await user.save();

//   res
//     .status(200)
//     .json({ status: SUCCESS, data: { message: "verification code sent" } });
// });

// const verifyEmail = asyncWrapper(async (req, res, next) => {
//   const hashedVerificationCode = hashing(req.body.verificationCode);
//   const user = await User.findOne({
//     _id: req.currentUser.id,
//     verified: false,
//     verificationCode: hashedVerificationCode,
//     verificationCodeValidation: { $gt: Date.now() },
//   });
//   if (!user) {
//     return next(
//       appErrors.create("Invalid or expired verification code", 400, FAIL)
//     );
//   }

//   user.verified = true;
//   user.verificationCode = undefined;
//   user.verificationCodeValidation = undefined;
//   await user.save();
//   res.status(200).json({
//     status: SUCCESS,
//     data: { message: "email verified successfully" },
//   });
// });

//change password
const changePassword = asyncWrapper(async (req, res, next) => {
  if (
    !req.body.oldPassword ||
    !req.body.newPassword ||
    !req.body.confirmPassword
  ) {
    return next(appErrors.create("All fields are required", 400, FAIL));
  }
  const user = await User.findById(req.currentUser.id).select("+password");
  if (!user) {
    const err = appErrors.create("User not found", 404, FAIL);
    return next(err);
  }
  const isMatched = await bcrypt.compare(req.body.oldPassword, user.password);
  if (!isMatched) {
    const err = appErrors.create("your old password is incorrect", 400, FAIL);
    return next(err);
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    const err = appErrors.create("passwords do not match", 400, FAIL);
    return next(err);
  }
  if (!validator.isStrongPassword(req.body.newPassword)) {
    const err = appErrors.create("Weak password", 400, FAIL);
    return next(err);
  }
  const hashedNewPassword = await bcrypt.hash(req.body.newPassword, 10);

  user.password = hashedNewPassword;
  user.passwordChangedAt = Date.now() - 1000;

  await user.save();
  res.status(200).json({
    status: SUCCESS,
    data: { message: "password changed successfully" },
  });
});

//password reset
const sendVerificationPassword = asyncWrapper(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(200).json({
      status: SUCCESS,
      data: {
        message: "If the email exists, a verification code has been sent",
      },
    });
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  const hashedCode = hashing(verificationCode);

  const mailOptions = {
    from: process.env.EMAIL,
    to: user.email,
    subject: "Your Verification Code",
    html: `
      <h2>Email Verification</h2>
      <p>Your code is:</p>
      <h1>${verificationCode}</h1>
      <p>Expires in 10 minutes</p>
    `,
  };
  await transport.sendMail(mailOptions);

  user.forgotPasswordCode = hashedCode;
  user.forgotPasswordCodeValidation = Date.now() + 60 * 60 * 1000;
  await user.save();

  res
    .status(200)
    .json({ status: SUCCESS, data: { message: "verification code sent" } });
});

const verifyPassword = asyncWrapper(async (req, res, next) => {
  const hashedCode = hashing(req.body.verificationCode);

  const user = await User.findOne({
    forgotPasswordCode: hashedCode,
    forgotPasswordCodeValidation: { $gt: Date.now() },
  });

  if (!user) {
    const err = appErrors.create(
      "Invalid or expired verification code",
      400,
      FAIL
    );

    return next(err);
  }

  const resetToken = generateTokens({
    id: user._id.toString(),
    role: user.role,
  });
  user.resetPasswordToken = hashing(resetToken);

  user.resetPasswordTokenExpires = Date.now() + 10 * 60 * 1000;
  user.forgotPasswordCode = undefined;
  user.forgotPasswordCodeValidation = undefined;
  await user.save();
  res.status(200).json({
    status: SUCCESS,
    data: { message: "code verified successfully", resetToken },
  });
});

const resetPassword = asyncWrapper(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  // 1️⃣ Validate inputs
  if (!newPassword || !confirmPassword) {
    return next(appErrors.create("All fields are required", 400, FAIL));
  }

  if (newPassword !== confirmPassword) {
    return next(appErrors.create("Passwords do not match", 400, FAIL));
  }

  if (!validator.isStrongPassword(newPassword)) {
    return next(appErrors.create("Weak password", 400, FAIL));
  }

  const hashedToken = hashing(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(appErrors.create("Invalid or expired reset token", 400, FAIL));
  }

  user.password = await bcrypt.hash(newPassword, 10);

  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpires = undefined;
  user.passwordChangedAt = Date.now();

  await user.save();

  res.status(200).json({
    status: SUCCESS,
    data: {
      message: "Password reset successfully, please login again",
    },
  });
});

const updateProfile = asyncWrapper(async (req, res, next) => {
  if (!req.file) {
    return next(appErrors.create("Please upload a file", 400, FAIL));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.currentUser.id,
    { avatar: req.file.path },
    { new: true }
  );

  res.status(200).json({
    status: SUCCESS,
    data: {
      user: updatedUser,
      message: "Profile updated successfully",
    },
  });
});

module.exports = {
  getUserDetails,
  getAllUsers,
  register,
  login,
  logout,
  // sendVerificationEmail,
  // verifyEmail,
  verifyEmailAfterRegister,
  changePassword,
  sendVerificationPassword,
  verifyPassword,
  verifyPassword,
  resetPassword,
  updateProfile,
  getUserBookingHistory,
};

const Booking = require("../models/booking.model"); // Ensure this is imported at top or here

async function getUserBookingHistory(req, res, next) {
  const bookings = await Booking.find({ user: req.currentUser.id })
    // Populate vehicle (and nested line info if needed, but let's start simple)
    .populate({
      path: "vehicle",
      select: "plateNumber model line",
      populate: {
        path: "line",
        select: "fromStation toStation",
        populate: [
          { path: "fromStation", select: "stationName" },
          { path: "toStation", select: "stationName" },
        ],
      },
      strictPopulate: false,
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: bookings.length,
    data: bookings,
  });
}
