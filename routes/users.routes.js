const express = require("express");
const VerifyToken = require("../middlewares/verifyToken");
const upload = require("../middlewares/upload");
const {
  register,
  login,
  logout,

  changePassword,
  sendVerificationPassword,
  verifyPassword,
  resetPassword,
  verifyEmailAfterRegister,
  getUserDetails,
  getUserBookingHistory,
} = require("../controller/users.controller");

const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "قمت بمحاولات تسجيل دخول كثيرة برجاء المحاولة بعد 15 دقيقة",
});

router.route("/user/:userId").get(getUserDetails);
router.route("/register").post(upload.single("avatar"), register);
router.route("/login").post(loginLimiter, login);
router.route("/logout").post(VerifyToken, logout);

//email verification
router.route("/verify-email").post(verifyEmailAfterRegister);

// router
//   .route("/send-verification-email")
//   .patch(VerifyToken, sendVerificationEmail);
// router.route("/verify-email").patch(VerifyToken, verifyEmail);

//change password
router.route("/change-password").post(VerifyToken, changePassword);

//password reset
router.route("/send-verification-password").post(sendVerificationPassword);
router.route("/verify-password").post(verifyPassword);
router.route("/reset-password/:token").post(resetPassword);

router.route("/history").get(VerifyToken, getUserBookingHistory);

// Fix imports in users.routes.js first then add
module.exports = router;
