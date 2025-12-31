const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      required: true,
    },
    plateNumber: {
      type: String,
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    isAirConditioned: {
      type: Boolean,
      default: false,
    },
    currentStatus: {
      type: String,
      enum: ["idle", "onRoute", "maintenance"],
      default: "idle",
    },
    lines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Line",
      },
    ],

    currentStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);
