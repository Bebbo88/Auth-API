const Line = require("../models/LinesModel");
const Station = require("../models/StationModel");
const mongoose = require("mongoose");
const appErrors = require("../utils/appErrors");

const asyncHandler = require("express-async-handler");
exports.addLineToStation = asyncHandler(async (req, res, next) => {
  const { stationId } = req.params; // fromStation
  const { toStation, price, distance } = req.body;

  // Validation: fromStation ≠ toStation
  if (stationId.toString() === toStation.toString()) {
    return next(
      new appErrors.create(
        "Origin and destination stations must be different",
        400
      )
    );
  }

  // Find both stations
  const [from, to] = await Promise.all([
    Station.findById(stationId),
    Station.findById(toStation),
  ]);

  if (!from || !to) {
    return next(new appErrors.create("One or both stations not found", 404));
  }

  // Check if line already exists
  const sameLine = await Line.findOne({
    fromStation: from._id,
    toStation: to._id,
  });

  if (sameLine) {
    return next(new appErrors.create("This Line already exists", 400));
  }

  // Create the new line
  const lineData = await Line.create({
    fromStation: from._id,
    toStation: to._id,
    price,
    distance,
  });

  // Optionally: add the line reference to the fromStation lines array
  from.lines.push(lineData._id);
  await from.save();

  return res.status(201).json({
    status: "success",
    message: "Line created successfully",
    data: lineData,
  });
});

exports.getAllLinesOfStation = asyncHandler(async (req, res, next) => {
  const { stationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(stationId)) {
    return next(new appErrors.create("Station not found", 400));
  }
  const lineData = await Line.find({ fromStation: stationId })
    .populate("fromStation", "stationName")
    .populate("toStation", "stationName");

  res.status(200).json({
    count: lineData.length,
    results: lineData,
  });
  res.status(200).json({ count: lineData.length, results: lineData });
});

exports.getOneLine = asyncHandler(async (req, res, next) => {
  const { lineId } = req.params;
  console.log(lineId);

  const lineDetails = await Line.findById(lineId)
    .populate("fromStation", "stationName")
    .populate("toStation", "stationName");
  res.status(200).json({ data: lineDetails });
});
