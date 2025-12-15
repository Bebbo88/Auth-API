const { body } = require("express-validator");

const validationShcema = [
  body("title").notEmpty().withMessage("Title is required"),
  body("price").notEmpty().withMessage("Price is required"),
];

module.exports = { validationShcema };
