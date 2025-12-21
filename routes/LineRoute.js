const {
  addLineToStation,
  getAllLinesOfStation,
  getOneLine,
  addBulkLinesToStation
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
  .get(getAllLineOfStationValidator, getAllLinesOfStation)
  .delete(deleteLineBetweenStations);
route.route("/:lineId").get(getOneLine);

route.route("/:stationId/bulk").post(addBulkLinesToStation);

module.exports = route;
