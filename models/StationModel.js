const { object } = require("joi");
const mongoose = require("mongoose");

const StationSchema = new mongoose.Schema(
  {
    stationName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    lines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Line",
      },
    ],
    status: {
      type: String,
      enum: ["active", "issues"],
      default: "active",
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
  },
  { timestamps: true }
);

StationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Station", StationSchema);
