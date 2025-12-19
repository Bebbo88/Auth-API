const { check } = require("express-validator");
const validatorMidlleware = require("../middlewares/validationSchema");

exports.addVichelToLineValidator = [
  check("lineId").isMongoId().withMessage("This Id Can't Be Found"),
  check("model")
    .notEmpty()
    .withMessage("Please Enter The Model Of car")
    .isString()
    .withMessage("The Car Model Must Be String"),
  ,
  check("driverName")
    .notEmpty()
    .withMessage("Please Enter The driverName Of car")
    .isString()
    .withMessage("The Car driverName Must Be String"),
  check("capacity")
    .notEmpty()
    .withMessage("Please Enter The capacity Of car")
    .isNumeric()
    .withMessage("The capacity Of car must be number"),

  validatorMidlleware,
];

exports.getVichelOfLineValidator = [
  check("lineId").isMongoId().withMessage("This Id Can't Be Found"),
  validatorMidlleware,
];
