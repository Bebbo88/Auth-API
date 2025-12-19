const mongoose = require("mongoose");

const LineSchema = new mongoose.Schema(
  {
    fromStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: [true, "Origin station is required"],
    },
    toStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: [true, "Destination station is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    distance: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Line", LineSchema);
