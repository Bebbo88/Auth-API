const appErrors = require("../utils/appErrors");
const { ERROR } = require("../utils/httpStatusText");
const jwt = require("jsonwebtoken");
const asyncWrapper = require("./asyncWrapper");
const User = require("../models/user.model"); // 👈 مهم

const VerifyToken = asyncWrapper(async (req, res, next) => {
  const authHeader =
    req.headers.authorization || (req.cookies && req.cookies.Authorization);

  if (!authHeader) {
    return next(appErrors.create("Please login first", 401, ERROR));
  }

  if (!authHeader.startsWith("Bearer ")) {
    return next(appErrors.create("Invalid token format", 401, ERROR));
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  if (!decoded || !decoded.id) {
    return next(appErrors.create("Unauthorized", 401, ERROR));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(appErrors.create("User not found", 401, ERROR));
  }

  req.currentUser = user; // ✅ User document كامل
  next();
});

module.exports = VerifyToken;
