const Line = require("../models/LinesModel");
const VichelModel = require("../models/vichelModel");
const appErrors = require("../utils/appErrors");
const mongoose = require("mongoose");

const asyncHandler = require("express-async-handler");

exports.addVichelToLine = asyncHandler(async (req, res, next) => {
  const { lineId } = req.params;
  const { plateNumber } = req.body;

  // جلب الخط الأصلي والعكسي
  const line = await Line.findById(lineId);
  if (!line) {
    return next(new appErrors.create("Line not found", 404));
  }

  const reverseLine = await Line.findOne({
    fromStation: line.toStation,
    toStation: line.fromStation,
  });

  // تحقق لو العربية موجودة في أي من الخطين
  const sameCar = await VichelModel.findOne({
    line: { $in: [lineId, reverseLine?._id] },
    plateNumber: plateNumber,
  });
  if (sameCar) {
    return next(new appErrors.create("This Car is already exist in this line", 400));
  }

  // إضافة العربية للخط الأصلي
  const vichelDataOriginal = await VichelModel.create({
    ...req.body,
    line: lineId,
  });

  let vichelDataReverse = null;
  if (reverseLine) {
    // إضافة العربية للخط العكسي
    vichelDataReverse = await VichelModel.create({
      ...req.body,
      line: reverseLine._id,
    });
  }

  return res.status(201).json({
    message: "Vichel added to both directions successfully",
    data: { original: vichelDataOriginal, reverse: vichelDataReverse }
  });
});


exports.getAllVichelOfLine = asyncHandler(async (req, res) => {
  const { lineId } = req.params;
  const vichelData = await VichelModel.find({ line: lineId }).populate({
    path: "line",
    select: "fromStation toStation",
    populate: [
      { path: "fromStation", select: "stationName" },
      { path: "toStation", select: "stationName" },
    ],
  });
  res.status(200).json({ count: vichelData.length, results: vichelData });
});
exports.getVichelOfLine = asyncHandler(async (req, res) => {
  const { veivheId } = req.params;
  const vichelData = await VichelModel.findById(veivheId).populate({
    path: "line",
    select: "fromStation toStation",
    populate: [
      { path: "fromStation", select: "stationName" },
      { path: "toStation", select: "stationName" },
    ],
  });
  res.status(200).json({ data: vichelData });
});
exports.addBulkVichelsToLine = asyncHandler(async (req, res, next) => {
  const { lineId } = req.params;
  const { vehicles } = req.body; // مصفوفة عربيات [{plateNumber, driverName, capacity}, ...]

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return next(new appErrors.create("Vehicles array is required", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const line = await Line.findById(lineId).session(session);
    if (!line) {
      throw new appErrors.create("Line not found", 404);
    }

    const reverseLine = await Line.findOne({
      fromStation: line.toStation,
      toStation: line.fromStation,
    }).session(session);

    const createdVehicles = [];

    for (const vehicle of vehicles) {
      const { plateNumber } = vehicle;

      // تحقق من وجود العربية مسبقًا
      const exists = await VichelModel.findOne({
        line: { $in: [line._id, reverseLine?._id] },
        plateNumber,
      }).session(session);

      if (exists) continue;

      // إضافة للعربية على الخط الأصلي
      const vichelOriginal = await VichelModel.create([{
        ...vehicle,
        line: line._id
      }], { session });
      createdVehicles.push(vichelOriginal[0]);

      // إضافة للخط العكسي لو موجود
      if (reverseLine) {
        const vichelReverse = await VichelModel.create([{
          ...vehicle,
          line: reverseLine._id
        }], { session });
        createdVehicles.push(vichelReverse[0]);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Vehicles added to line (original & reverse) successfully",
      count: createdVehicles.length,
      data: createdVehicles
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});