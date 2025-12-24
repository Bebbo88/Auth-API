const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
    {
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vichels",
            required: true,
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        passengerCount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["completed"],
            default: "completed",
        },
        bookings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Booking",
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
