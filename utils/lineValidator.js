const { check } = require("express-validator");
const validatorMidlleware = require("../middlewares/validationSchema");

exports.addLineToStationValidator = [
  check("toStation")
    .isMongoId()
    .withMessage("This Id of other station Can't Be Found"),

  check("stationId")
    .isMongoId()
    .withMessage("This Id of current station Can't Be Found"),

  check("price")
    .notEmpty()
    .withMessage("Please Enter Price")
    .isNumeric()
    .withMessage("Price Must Be a Number"),

  check("distance")
    .notEmpty()
    .withMessage("Please Enter distance")
    .isNumeric()
    .withMessage("distance Must Be a Number"),
  validatorMidlleware,
];

exports.getAllLineOfStationValidator = [
  check("stationId").isMongoId().withMessage("This Id Can't Be Found"),
  validatorMidlleware,
];
