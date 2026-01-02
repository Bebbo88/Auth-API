const station = require("../models/StationModel");
const asyncHandler = require("express-async-handler");
const User = require("../models/user.model");
const Line = require("../models/LinesModel");
const Vehicle = require("../models/vichelModel");
const Booking = require("../models/booking.model");
const Trip = require("../models/trip.model");

// ➕ Add Station
// ➕ Add Stations (Bulk)
exports.addStations = asyncHandler(async (req, res, next) => {
  const stations = await station.insertMany(req.body);
  res.status(201).json({
    status: "success",
    message: `${stations.length} stations added successfully`,
    data: stations,
  });
});

// Add Station
exports.addStations = asyncHandler(async (req, res) => {
  if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "Body must be a non-empty array",
    });
  }

  const stations = await station.insertMany(req.body, { ordered: false });
  res.status(201).json({
    status: "success",
    message: `${stations.length} stations added successfully`,
    data: stations,
  });
});

// Add Admin To Station
exports.addAdminToStation = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const { adminId } = req.body;

  const stationToUpdate = await station.findById(stationId);
  if (!stationToUpdate) {
    return res.status(404).json({
      status: "fail",
      message: "Station not found",
    });
  }
  const admin = await User.findById(adminId);
  console.log(admin);
  if (!admin) {
    return res.status(404).json({
      status: "fail",
      message: "Admin not found",
      data: admin,
    });
  }
  if (stationToUpdate.admin) {
    return res.status(400).json({
      status: "fail",
      message: "Station already has an admin",
      data: stationToUpdate,
    });
  }

  stationToUpdate.admin = adminId;
  await stationToUpdate.save();

  res.status(200).json({
    status: "success",
    message: "Admin added to station successfully",
    data: stationToUpdate,
  });
});

// Get All Stations
exports.getAllStations = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  // Get total count of documents
  const totalCount = await station.countDocuments();
  const lastPage = Math.ceil(totalCount / limit);

  const allStations = await station
    .find({}, { __v: false })
    .limit(limit)
    .skip(skip)
    .populate("lines", "fromStation toStation price distance");

  res.status(200).json({
    totalCount,
    lastPage,
    count: allStations.length,
    page,
    limit,
    data: allStations,
  });
});

//Get One Station
exports.getOneStation = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const oneStation = await station.findById(stationId).populate({
    path: "lines",
    select: "fromStation toStation price distance",
    populate: [
      { path: "fromStation", select: "stationName" },
      { path: "toStation", select: "stationName" },
    ],
  });

  if (!oneStation) {
    return res.status(404).json({
      status: "fail",
      message: "Station not found",
    });
  }

  res.status(200).json({ data: oneStation });
});

// Get Nearby Stations (Geo)
exports.getNearbyStations = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 5000 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      status: "fail",
      message: "lat and lng are required",
    });
  }

  const latitude = Number(lat);
  const longitude = Number(lng);
  const maxDistance = Number(distance);

  const stations = await station.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        spherical: true,
        maxDistance,
      },
    },
    {
      $lookup: {
        from: "lines",
        localField: "lines",
        foreignField: "_id",
        as: "lines",
      },
    },
    {
      $project: {
        stationName: 1,
        location: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        lines: {
          _id: 1,
          fromStation: 1,
          toStation: 1,
          price: 1,
          distance: 1,
        },
      },
    },
  ]);

  res.status(200).json({
    count: stations.length,
    data: stations,
  });
});

// Delete Station
exports.deleteStation = asyncHandler(async (req, res) => {
  const { stationId } = req.params;

  // Delete all lines associated with this station (incoming or outgoing)
  await Line.deleteMany({
    $or: [{ fromStation: stationId }, { toStation: stationId }],
  });

  const deletedStation = await station.findByIdAndDelete(stationId);

  if (!deletedStation) {
    return res.status(404).json({
      status: "fail",
      message: "Station not found",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Station and associated lines deleted successfully",
    data: deletedStation,
  });
});

exports.updateStation = asyncHandler(async (req, res) => {
  const { stationId } = req.params;

  const stationToUpdate = await station.findById(stationId);
  if (!stationToUpdate) {
    return res.status(404).json({
      status: "fail",
      message: "Station not found",
    });
  }

  if (stationToUpdate.admin.toString() !== req.currentUser._id.toString()) {
    return res.status(401).json({
      status: "fail",
      message: "You are not authorized to update this station",
    });
  }

  const updatedStation = await station.findByIdAndUpdate(stationId, req.body, {
    new: true,
  });

  res.status(200).json({ data: updatedStation });
});

exports.getStationStats = asyncHandler(async (req, res, next) => {
  const { stationId } = req.params;

  // 1. Active Vehicles: Count vehicles currently at this station
  const activeVehicles = await Vehicle.countDocuments({
    currentStation: stationId,
  });

  // 2. Today's Passengers: Sum passengerCount from trips recorded today for vehicles at this station
  // We first find all vehicles that belong to this station (have this station in their lines)
  // or simply vehicles that have this station as currentStation?
  // User asked for "today's passengers" for the station.
  // Best way: find all trips for vehicles that are currently associated with this station's lines.

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Find all lines of this station to get associated vehicles
  const stationLines = await Line.find({ fromStation: stationId }).select(
    "_id"
  );
  const lineIds = stationLines.map((l) => l._id);

  // Find vehicles on these lines
  const vehicles = await Vehicle.find({ lines: { $in: lineIds } }).select(
    "_id"
  );
  const vehicleIds = vehicles.map((v) => v._id);

  // Aggregate trip passengers for today
  const tripsToday = await Trip.find({
    vehicle: { $in: vehicleIds },
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  const todayPassengers = tripsToday.reduce(
    (sum, trip) => sum + trip.passengerCount,
    0
  );
  const todayTrips = tripsToday.length;

  res.status(200).json({
    status: "success",
    data: {
      activeVehicles,
      todayPassengers,
      todayTrips,
    },
  });
});
