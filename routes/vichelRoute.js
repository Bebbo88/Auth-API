const {
  addVichelToLine,
  getAllVichelOfLine,
  getVichelOfLine,
} = require("../service/vichelService");
const express = require("express");
const {
  addVichelToLineValidator,
  getVichelOfLineValidator,
} = require("../utils/vichelValidator");
const allowedTo = require("../middlewares/allowedTo");
const userRoles = require("../utils/userRoles");
const VerifyToken = require("../middlewares/verifyToken");

const route = express.Router({ mergeParams: true });

route
  .route("/")
  .post(
    VerifyToken,
    allowedTo(userRoles.ADMIN),
    addVichelToLineValidator,
    addVichelToLine
  )
  .get(getVichelOfLineValidator, getAllVichelOfLine);
route.route("/:veivheId").get(getVichelOfLine);

module.exports = route;
