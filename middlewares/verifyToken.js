const appErrors = require("../utils/appErrors");
const { ERROR } = require("../utils/httpStatusText");
const jwt = require("jsonwebtoken");
const asyncWrapper = require("./asyncWrapper");

const VerifyToken = asyncWrapper(async (req, res, next) => {
  const token =
    req.headers.authorization || (req.cookies && req.cookies.Authorization);

  if (!token) {
    return next(appErrors.create("Please login first", 401, ERROR));
  }

  if (!token.startsWith("Bearer ")) {
    return next(appErrors.create("Invalid token format", 401, ERROR));
  }

  const accessToken = token.split(" ")[1];

  const currentUser = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
  if (!currentUser) {
    const error = appErrors.create("Unauthorized", 401, ERROR);
    return next(error);
  }
  req.currentUser = currentUser;
  next();
});
module.exports = VerifyToken;
