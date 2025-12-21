const Line = require("../models/LinesModel");
const Station = require("../models/StationModel");
const mongoose = require("mongoose");
const appErrors = require("../utils/appErrors");

const asyncHandler = require("express-async-handler");



exports.addBulkLinesToStation = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { stationId } = req.params; // fromStation
    const { lines } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      throw new appErrors.create("Lines array is required", 400);
    }

    const fromStation = await Station.findById(stationId).session(session);
    if (!fromStation) {
      throw new appErrors.create("Origin station not found", 404);
    }

    const createdLines = [];
    const stationUpdates = new Map();

    for (const line of lines) {
      const { toStation, price, distance } = line;

      if (!toStation || price <= 0 || distance <= 0) {
        throw new appErrors.create("Invalid line data", 400);
      }

      if (stationId === toStation) {
        throw new appErrors.create(
          "Origin and destination stations must be different",
          400
        );
      }

      const to = await Station.findById(toStation).session(session);
      if (!to) {
        throw new appErrors.create("Destination station not found", 404);
      }

      // Check duplicate (both directions)
      const exists = await Line.findOne({
        $or: [
          { fromStation: stationId, toStation },
          { fromStation: toStation, toStation: stationId },
        ],
      }).session(session);

      if (exists) {
        throw new appErrors.create(
          `Line already exists between stations`,
          400
        );
      }

      // Create forward & reverse
      const [forward, reverse] = await Line.create(
        [
          {
            fromStation: stationId,
            toStation,
            price,
            distance,
          },
          {
            fromStation: toStation,
            toStation: stationId,
            price,
            distance,
          },
        ],
        { session }
      );

      createdLines.push(forward, reverse);

      fromStation.lines.push(forward._id);
      to.lines.push(reverse._id);

      stationUpdates.set(to._id.toString(), to);
    }

    // Save all stations
    await Promise.all([
      fromStation.save({ session }),
      ...stationUpdates.values().map((s) => s.save({ session })),
    ]);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      count: createdLines.length,
      message: "Bulk lines created successfully",
      data: createdLines,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

exports.addLineToStation = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { stationId } = req.params;
    const { toStation, price, distance } = req.body;

    // Validation
    if (stationId === toStation) {
      throw new appErrors.create(
        "Origin and destination stations must be different",
        400
      );
    }

    if (price <= 0 || distance <= 0) {
      throw new appErrors.create(
        "Price and distance must be positive numbers",
        400
      );
    }

    const [from, to] = await Promise.all([
      Station.findById(stationId).session(session),
      Station.findById(toStation).session(session),
    ]);

    if (!from || !to) {
      throw new appErrors.create("One or both stations not found", 404);
    }

    // Check existing line (both directions)
    const existingLine = await Line.findOne({
      $or: [
        { fromStation: from._id, toStation: to._id },
        { fromStation: to._id, toStation: from._id },
      ],
    }).session(session);

    if (existingLine) {
      throw new appErrors.create(
        "This line or its reverse already exists",
        400
      );
    }

    // Create lines
    const [lineForward, lineReverse] = await Promise.all([
      Line.create(
        [
          {
            fromStation: from._id,
            toStation: to._id,
            price,
            distance,
          },
        ],
        { session }
      ),
      Line.create(
        [
          {
            fromStation: to._id,
            toStation: from._id,
            price,
            distance,
          },
        ],
        { session }
      ),
    ]);

    from.lines.push(lineForward[0]._id);
    to.lines.push(lineReverse[0]._id);

    await Promise.all([
      from.save({ session }),
      to.save({ session }),
    ]);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Lines created successfully (both directions)",
      data: {
        forward: lineForward[0],
        reverse: lineReverse[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
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

exports.deleteLineBetweenStations = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { stationId } = req.params;
    const { toStation } = req.body;

    if (!toStation) {
      throw new appErrors.create("toStation is required", 400);
    }

    if (stationId === toStation) {
      throw new appErrors.create(
        "Origin and destination stations must be different",
        400
      );
    }

    const [from, to] = await Promise.all([
      Station.findById(stationId).session(session),
      Station.findById(toStation).session(session),
    ]);

    if (!from || !to) {
      throw new appErrors.create("One or both stations not found", 404);
    }

    // Find both directions
    const lines = await Line.find({
      $or: [
        { fromStation: stationId, toStation },
        { fromStation: toStation, toStation: stationId },
      ],
    }).session(session);

    if (lines.length === 0) {
      throw new appErrors.create("Line not found", 404);
    }

    const lineIds = lines.map((l) => l._id);

    // Delete lines
    await Line.deleteMany({ _id: { $in: lineIds } }).session(session);

    // Remove line refs from stations
    from.lines = from.lines.filter(
      (id) => !lineIds.some((l) => l.equals(id))
    );
    to.lines = to.lines.filter(
      (id) => !lineIds.some((l) => l.equals(id))
    );

    await Promise.all([
      from.save({ session }),
      to.save({ session }),
    ]);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: "Line deleted successfully (both directions)",
      deletedLines: lineIds,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});