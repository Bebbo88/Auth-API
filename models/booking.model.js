const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Booking must belong to a user"],
        },
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vichels",
            required: [true, "Booking must belong to a vehicle"],
        },
        status: {
            type: String,
            enum: ["active", "cancelled", "completed"],
            default: "active",
        },
        price: {
            type: Number,
            default: 0,
        },
        seatNumber: {
            type: String,
        },
    },
    { timestamps: true }
);

// Prevent duplicate active bookings for same user on same vehicle
// This replaces the .includes check we had before
bookingSchema.index({ user: 1, vehicle: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "active" } });

module.exports = mongoose.model("Booking", bookingSchema);
