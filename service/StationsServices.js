const station = require("../models/StationModel");
const asyncHandler = require("express-async-handler");

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

// 📄 Get All Stations
exports.getAllStations = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 10;
  const page = req.query.page || 1;
  const skip = (page - 1) * limit;
  const allStations = await station
    .find({}, { __v: false })
    .limit(limit)
    .skip(skip)
    .populate("lines", "fromStation toStation price distance");
  res.status(200).json({
    count: allStations.length,
    page,
    limit,
    data: allStations,
  });
});

// 📍 Get One Station
exports.getOneStation = asyncHandler(async (req, res) => {
  const { stationId } = req.params;
  const oneStation = await station
    .findById(stationId)
    .populate("lines", "fromStation toStation price distance");

  if (!oneStation) {
    return res.status(404).json({
      status: "fail",
      message: "Station not found",
    });
  }

  res.status(200).json({ data: oneStation });
});

// 📌 Get Nearby Stations (Geo)
exports.getNearbyStations = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 5000 } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({
      status: "fail",
      message: "lat and lng are required",
    });
  }

  // تحويل القيم لـ Number
  const latitude = Number(lat);
  const longitude = Number(lng);
  const maxDistance = Number(distance); // بالمتر

  // تأكد إنك عامل index 2dsphere في StationSchema
  const stations = await station
    .aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude], // [lng, lat]
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: maxDistance,
        },
      },
    ])
    .populate("lines", "fromStation toStation price distance");

  res.status(200).json({
    status: "success",
    results: stations.length,
    data: stations,
  });
});
