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

  // Check if line already exists (both directions)
  const existingLineForward = await Line.findOne({
    fromStation: from._id,
    toStation: to._id,
  });
  const existingLineReverse = await Line.findOne({
    fromStation: to._id,
    toStation: from._id,
  });

  if (existingLineForward || existingLineReverse) {
    return next(
      new appErrors.create("This Line or its reverse already exists", 400)
    );
  }

  // Create the new lines (forward and reverse)
  const [lineForward, lineReverse] = await Promise.all([
    Line.create({
      fromStation: from._id,
      toStation: to._id,
      price,
      distance,
    }),
    Line.create({
      fromStation: to._id,
      toStation: from._id,
      price,
      distance,
    }),
  ]);

  // Add the line references to both stations
  from.lines.push(lineForward._id);
  to.lines.push(lineReverse._id);
  await Promise.all([from.save(), to.save()]);

  return res.status(201).json({
    status: "success",
    message: "Lines created successfully (both directions)",
    data: { forward: lineForward, reverse: lineReverse },
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
