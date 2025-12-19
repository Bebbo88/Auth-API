const Line = require("../models/LinesModel");
const VichelModel = require("../models/vichelModel");
const appErrors = require("../utils/appErrors");
const mongoose = require("mongoose");

const asyncHandler = require("express-async-handler");

exports.addVichelToLine = asyncHandler(async (req, res, next) => {
  const { lineId } = req.params;
  const { plateNumber } = req.body;

  const sameCar = await VichelModel.findOne({
    line: lineId,
    plateNumber: plateNumber,
  });
  if (sameCar) {
    return next(new appErrors.create("This Car is already exist", 400));
  }
  const vichelData = await VichelModel.create({
    ...req.body,
    line: lineId,
  });

  return res.status(201).json({ data: vichelData });
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
