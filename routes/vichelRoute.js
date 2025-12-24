const {
  addVichelToLine,
  getAllVichelOfLine,
  getVichelOfLine,
  addBulkVichelsToLine,
  bookSeat,
  cancelBooking,
  resetVichelBookings,
  getVichelActiveTrip,
  getVehicleTrips,
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
route.route("/bulk").post(addBulkVichelsToLine);

route.route("/:veivheId").get(getVichelOfLine);
route
  .route("/:vichelId/book")
  .post(VerifyToken, bookSeat)
  .delete(VerifyToken, cancelBooking);

route.route("/:vichelId/reset").post(VerifyToken, resetVichelBookings);
route.route("/:vichelId/active-trip").get(VerifyToken, getVichelActiveTrip);
route.route("/:vichelId/trips").get(VerifyToken, getVehicleTrips);

module.exports = route;
