const appErrors = require("../utils/appErrors");
const { ERROR } = require("../utils/httpStatusText");

const allowedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role)) {
      const err = appErrors.create("Forbidden", 403, ERROR);
      return next(err);
    }
    next();
  };
};

module.exports = allowedTo;
