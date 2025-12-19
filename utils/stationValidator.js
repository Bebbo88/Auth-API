const { check, body } = require("express-validator");
const validatorMidlleware = require("../middlewares/validationSchema");

exports.addStationsValidator = [
  body().isArray().withMessage("Body must be an array of stations"),

  body("*.stationName")
    .notEmpty()
    .withMessage("Please Enter Station Name")
    .isLength({ min: 3, max: 30 })
    .withMessage("Station Name Must Be 3-30 Chars"),

  body("*.location.coordinates")
    .custom((coords) => {
      // لازم يكون مصفوفة طولها 2 وكل عنصر رقم
      if (!Array.isArray(coords)) return false;
      if (coords.length !== 2) return false;
      return coords.every((c) => typeof c === "number");
    })
    .withMessage("Coordinates must be [lng, lat]"),

  body("*.location.type")
    .equals("Point")
    .withMessage("Location type must be Point"),

  validatorMidlleware,
];

exports.getOneStationValidator = [
  check("stationId").isMongoId().withMessage("This Id Can't Be Found"),
  validatorMidlleware,
];
