// const { body } = require("express-validator");

// const validationShcema = [
//   body("title").notEmpty().withMessage("Title is required"),
//   body("price").notEmpty().withMessage("Price is required"),
// ];

// module.exports = { validationShcema };

const { validationResult } = require("express-validator");

const validatorMidlleware = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ errors: result.array() });
  }
  next();
};
module.exports = validatorMidlleware;
