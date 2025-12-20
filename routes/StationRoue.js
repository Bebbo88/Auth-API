const {
  //addStation,
  getAllStations,
  getOneStation,
  addStations,
  getNearbyStations,
} = require("../service/StationsServices");
const express = require("express");
const {
  addStationsValidator,
  getOneStationValidator,
} = require("../utils/stationValidator");
const LineRoute = require("./LineRoute");
const allowedTo = require("../middlewares/allowedTo");
const userRoles = require("../utils/userRoles");
const VerifyToken = require("../middlewares/verifyToken");

const route = express.Router();

route.use("/:stationId/lines", LineRoute);

route
  .route("/")
  .post(
    VerifyToken,
    allowedTo(userRoles.ADMIN),
    addStationsValidator,
    addStations
  )
  .get(getAllStations);
route.route("/near").get(getNearbyStations);
route.route("/:stationId").get(getOneStationValidator, getOneStation);

module.exports = route;
