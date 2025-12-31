const mongoose = require("mongoose");

const VeichelSchema = mongoose.Schema({
  model: {
    type: String,
    required: [true, "model of car must be add"],
  },
  plateNumber: {
    type: String,
    required: [true, "plateNumber of car must be add"],
  },
  driverName: {
    type: String,
    required: [true, "driverName of car must be add"],
  },
  capacity: {
    type: Number,
    required: [true, "capacity of car must be add"],
  },
  isAirConditioned: {
    type: Boolean,
    default: false,
  },

  currentStatus: {
    type: String,
    enum: ["idle", "loading", "onRoute", "maintenance"],
    default: "idle",
  },
  currentStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Station",
  },
  line: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Line",
    required: true,
  },
});

module.exports = mongoose.model("Vichels", VeichelSchema);
//693b4c44369615fb61ed6988
