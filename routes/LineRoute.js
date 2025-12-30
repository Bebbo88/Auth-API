const {
  addLineToStation,
  getAllLinesOfStation,
  getOneLine,
  addBulkLinesToStation,
  deleteLineBetweenStations,
  updateLineBetweenStations,
} = require("../service/LineServices");
const express = require("express");
const {
  addLineToStationValidator,
  getAllLineOfStationValidator,
} = require("../utils/lineValidator");
const allowedTo = require("../middlewares/allowedTo");
const userRoles = require("../utils/userRoles");
const VerifyToken = require("../middlewares/verifyToken");
const route = express.Router({ mergeParams: true });

const vichelRoute = require("./vichelRoute");
route.use("/:lineId/vichels", vichelRoute);

route
  .route("/")
  .post(
    VerifyToken,
    allowedTo(userRoles.ADMIN),
    addLineToStationValidator,
    addLineToStation
  )
  .get(getAllLineOfStationValidator, getAllLinesOfStation);

route
  .route("/:lineId")
  .put(VerifyToken, allowedTo(userRoles.ADMIN), updateLineBetweenStations)
  .delete(VerifyToken, allowedTo(userRoles.ADMIN), deleteLineBetweenStations);

//route.route("/bulk").post(addBulkLinesToStation);

route.route("/:lineId").get(getOneLine);

module.exports = route;
