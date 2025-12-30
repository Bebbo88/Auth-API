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
  confirmBooking,
  deleteVichel,
  updateVichel,
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

route
  .route("/:vichelId")
  .get(getVichelOfLine)
  .delete(VerifyToken, allowedTo(userRoles.ADMIN), deleteVichel)
  .put(VerifyToken, allowedTo(userRoles.ADMIN), updateVichel);

route
  .route("/:vichelId/book")
  .post(VerifyToken, bookSeat)
  .delete(VerifyToken, cancelBooking);
route
  .route("/:vichelId/book/:bookingId/confirm")
  .post(VerifyToken, confirmBooking);

route
  .route("/:vichelId/reset")
  .post(VerifyToken, allowedTo(userRoles.ADMIN), resetVichelBookings);
route
  .route("/:vichelId/active-trip")
  .get(VerifyToken, allowedTo(userRoles.ADMIN), getVichelActiveTrip);
route
  .route("/:vichelId/trips")
  .get(VerifyToken, allowedTo(userRoles.ADMIN), getVehicleTrips);
module.exports = route;
