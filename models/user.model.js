const mongoose = require("mongoose");
const validator = require("validator");
const userRoles = require("../utils/userRoles");
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, "Invalid email"],
    },
    password: {
      type: String,
      required: [true, "password is required"],
      select: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: Object.values(userRoles),
      default: userRoles.USER,
    },
    avatar: { type: String, default: "profile.jpg" },

    // verificationCode: { type: Number, select: false },
    // verificationCodeValidation: { type: Number, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    forgotPasswordCode: { type: String, select: false },
    forgotPasswordCodeValidation: { type: Date, select: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
