const Line = require("../models/LinesModel");
const VichelModel = require("../models/vichelModel");
const Booking = require("../models/booking.model");
const appErrors = require("../utils/appErrors");
const mongoose = require("mongoose");
const station = require("../models/StationModel");

const asyncHandler = require("express-async-handler");

exports.addVichelToLine = asyncHandler(async (req, res, next) => {
  const { lineId, stationId } = req.params;
  const { plateNumber, model, driverName, capacity, isAirConditioned } =
    req.body;

  // 1️⃣ check station
  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (
    !stationData.admin ||
    stationData.admin.toString() !== req.currentUser._id.toString()
  ) {
    return next(new Error("You are not authorized", 401));
  }

  // 2️⃣ check line
  const line = await Line.findById(lineId);
  if (!line) {
    return next(new Error("Line not found", 404));
  }

  // 3️⃣ get reverse line
  const reverseLine = await Line.findOne({
    fromStation: line.toStation,
    toStation: line.fromStation,
  });

  // 4️⃣ get or create vehicle (ONE ID ONLY)
  let vehicle = await VichelModel.findOne({ plateNumber });

  if (!vehicle) {
    // 🆕 create once
    vehicle = await VichelModel.create({
      model,
      plateNumber,
      driverName,
      capacity,
      isAirConditioned,
      lines: reverseLine ? [lineId, reverseLine._id] : [lineId],
      currentStation: stationId,
    });
  } else {
    // ➕ add lines if not exists
    const newLines = [lineId];
    if (reverseLine) newLines.push(reverseLine._id);

    const mergedLines = new Set([
      ...vehicle.lines.map((id) => id.toString()),
      ...newLines.map((id) => id.toString()),
    ]);

    vehicle.lines = Array.from(mergedLines);
    vehicle.currentStation = stationId;

    await vehicle.save();
  }

  res.status(201).json({
    status: "success",
    message: "Vehicle added to line(s) successfully",
    data: vehicle,
  });
});

exports.getAllVichelOfLine = asyncHandler(async (req, res) => {
  const { lineId, stationId } = req.params;

  const vichels = await VichelModel.find({
    lines: lineId,
    currentStation: stationId,
  })
    .populate({
      path: "lines",
      match: { _id: lineId }, // عشان يجيب الخط المطلوب بس
      select: "fromStation toStation",
      populate: [
        { path: "fromStation", select: "stationName" },
        { path: "toStation", select: "stationName" },
      ],
    })
    .populate({
      path: "currentStation",
      select: "stationName",
    })
    .lean();

  const results = await Promise.all(
    vichels.map(async (vehicle) => {
      const bookings = await Booking.find({
        vehicle: vehicle._id,
        status: { $in: ["active", "pending"] },
      }).populate("user", "firstName lastName email phoneNumber");

      const activeBookingsCount = bookings.length;
      const availableSeats = vehicle.capacity - activeBookingsCount;

      return {
        ...vehicle,

        // 👇 نفس الـ response + currentStation
        currentStation: vehicle.currentStation,

        bookedUsers: bookings.map((b) => ({
          ...b.user.toObject(),
          bookingStatus: b.status,
          bookingId: b._id,
          bookedAt: b.createdAt,
        })),
        availableSeats,
      };
    })
  );

  res.status(200).json({
    count: results.length,
    results,
  });
});
exports.getAllVichels = asyncHandler(async (req, res) => {
  const { lineId } = req.params;

  const vichels = await VichelModel.find({
    lines: lineId,
  })
    .populate({
      path: "lines",
      match: { _id: lineId }, // عشان يجيب الخط المطلوب بس
      select: "fromStation toStation",
      populate: [
        { path: "fromStation", select: "stationName" },
        { path: "toStation", select: "stationName" },
      ],
    })
    .populate({
      path: "currentStation",
      select: "stationName",
    })
    .lean();

  const results = await Promise.all(
    vichels.map(async (vehicle) => {
      const bookings = await Booking.find({
        vehicle: vehicle._id,
        status: { $in: ["active", "pending"] },
      }).populate("user", "firstName lastName email phoneNumber");

      const activeBookingsCount = bookings.length;
      const availableSeats = vehicle.capacity - activeBookingsCount;

      return {
        ...vehicle,

        // 👇 نفس الـ response + currentStation
        currentStation: vehicle.currentStation,

        bookedUsers: bookings.map((b) => ({
          ...b.user.toObject(),
          bookingStatus: b.status,
          bookingId: b._id,
          bookedAt: b.createdAt,
        })),
        availableSeats,
      };
    })
  );

  res.status(200).json({
    count: results.length,
    results,
  });
});

exports.getVichelOfLine = asyncHandler(async (req, res) => {
  const { vichelId } = req.params;

  const vehicle = await VichelModel.findById(vichelId)
    .populate({
      path: "lines",
      select: "fromStation toStation",
      populate: [
        { path: "fromStation", select: "stationName" },
        { path: "toStation", select: "stationName" },
      ],
    })
    .populate({
      path: "currentStation",
      select: "stationName",
    })
    .lean();

  if (vehicle) {
    const bookings = await Booking.find({
      vehicle: vehicle._id,
      status: "active",
    }).populate("user", "firstName lastName email phoneNumber");

    vehicle.bookedUsers = bookings.map((b) => ({
      ...b.user.toObject(),
      bookingStatus: b.status,
      bookingId: b._id,
      bookedAt: b.createdAt,
    }));

    vehicle.availableSeats = vehicle.capacity - bookings.length;
  }

  res.status(200).json({
    data: vehicle,
    id: vichelId,
  });
});

exports.addBulkVichelsToLine = asyncHandler(async (req, res, next) => {
  const { lineId } = req.params;
  const { vehicles } = req.body; // مصفوفة عربيات [{plateNumber, driverName, capacity}, ...]

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return next(new Error("Vehicles array is required", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const line = await Line.findById(lineId).session(session);
    if (!line) {
      throw new Error("Line not found", 404);
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
      const vichelOriginal = await VichelModel.create(
        [
          {
            ...vehicle,
            line: line._id,
          },
        ],
        { session }
      );
      createdVehicles.push(vichelOriginal[0]);

      // إضافة للخط العكسي لو موجود
      if (reverseLine) {
        const vichelReverse = await VichelModel.create(
          [
            {
              ...vehicle,
              line: reverseLine._id,
            },
          ],
          { session }
        );
        createdVehicles.push(vichelReverse[0]);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Vehicles added to line (original & reverse) successfully",
      count: createdVehicles.length,
      data: createdVehicles,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});

exports.bookSeat = asyncHandler(async (req, res, next) => {
  const { vichelId } = req.params;
  const userId = req.currentUser._id;

  const vehicle = await VichelModel.findById(vichelId)
    .populate({
      path: "lines",
      select: "fromStation toStation price",
      populate: [
        { path: "fromStation", select: "stationName" },
        { path: "toStation", select: "stationName" },
      ],
    })
    .populate({ path: "currentStation", select: "stationName" })
    .lean();

  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  // Count active bookings
  const activeBookingsCount = await Booking.countDocuments({
    vehicle: vichelId,

    status: { $in: ["active", "pending"] },
  });

  if (activeBookingsCount >= vehicle.capacity) {
    return next(new Error("No seats available", 400));
  }

  // Check if user already booked in this vehicle
  const existingBooking = await Booking.findOne({
    vehicle: vichelId,
    user: userId,
    status: { $in: ["active", "pending"] },
  });

  if (existingBooking) {
    return next(new Error("You have already booked a seat", 400));
  }

  // Check if user has pending booking in another vehicle
  const bookAnotherVehicle = await Booking.findOne({
    user: userId,
    status: "pending",
  });

  if (bookAnotherVehicle) {
    return next(
      new Error("You have already booked a seat in another vehicle", 400)
    );
  }

  // Get price from first line only (for compatibility with old response)
  const price = vehicle.lines?.[0]?.price || 0;

  const newBooking = await Booking.create({
    user: userId,
    vehicle: vichelId,
    status: "pending",
    price,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  // Populate user and vehicle details
  await newBooking.populate([
    { path: "user", select: "firstName lastName email phoneNumber" },
    {
      path: "vehicle",
      select: "model plateNumber driverName capacity currentStation lines",
      populate: [
        { path: "currentStation", select: "stationName" },
        {
          path: "lines",
          select: "fromStation toStation price",
          populate: [
            { path: "fromStation", select: "stationName" },
            { path: "toStation", select: "stationName" },
          ],
        },
      ],
    },
  ]);

  // لو عايز تخلي response متوافق مع القديم:
  // ممكن ترجّع أول line فقط
  if (newBooking.vehicle.lines?.length) {
    newBooking.vehicle.line = newBooking.vehicle.lines[0];
    delete newBooking.vehicle.lines;
  }

  res.status(200).json({
    status: "success",
    message: "تم حجز المقعد مؤقتًا، يرجى التأكيد قبل انتهاء الوقت",
    data: newBooking,
  });
});

exports.confirmBooking = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new Error("Booking not found", 404));
  }

  if (booking.status !== "pending") {
    return next(new Error("Booking already processed", 400));
  }

  if (booking.expiresAt < Date.now()) {
    booking.status = "cancelled";
    await booking.save();
    return next(new Error("Booking expired", 400));
  }

  booking.status = "active";
  booking.expiresAt = null;
  await booking.save();

  await booking.populate([
    { path: "user", select: "firstName lastName email phoneNumber" },
    {
      path: "vehicle",
      select: "model plateNumber driverName capacity currentStation",
      populate: { path: "currentStation", select: "stationName" },
    },
  ]);

  res.status(200).json({
    status: "success",
    message: "Booking confirmed",
    data: booking,
  });
});

exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const { vichelId } = req.params;
  const userId = req.currentUser._id;

  const booking = await Booking.findOne({
    vehicle: vichelId,
    user: userId,
    status: { $in: ["active", "pending"] },
  });

  if (!booking) {
    return next(new Error("No active booking found for this vehicle", 404));
  }

  booking.status = "cancelled";
  await booking.save();

  await booking.populate([
    { path: "user", select: "firstName lastName email phoneNumber" },
    {
      path: "vehicle",
      select: "model plateNumber driverName capacity currentStation",
      populate: { path: "currentStation", select: "stationName" },
    },
  ]);

  res.status(200).json({
    status: "success",
    message: "Booking canceled successfully",
    data: booking,
  });
});

const Trip = require("../models/trip.model"); // Ensure import at top

exports.resetVichelBookings = asyncHandler(async (req, res, next) => {
  const { stationId, vichelId, lineId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(
      new Error("You are not authorized to update this vehicle", 403)
    );
  }

  if (!vichelId) {
    return next(new Error("Vehicle ID is required to reset bookings", 400));
  }

  const vehicle = await VichelModel.findById(vichelId);
  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  // Find the line to determine the destination
  const line = await Line.findById(lineId);
  if (!line) {
    return next(new Error("Line not found", 404));
  }

  const activeBookings = await Booking.find({
    vehicle: vehicle._id,
    status: { $in: ["active", "pending"] },
  });

  let tripsCreated = 0;
  let bookingsModified = 0;

  if (activeBookings.length > 0) {
    await Trip.create({
      vehicle: vehicle._id,
      passengerCount: activeBookings.length,
      bookings: activeBookings.map((b) => b._id),
      date: new Date(),
    });

    const result = await Booking.updateMany(
      {
        vehicle: vehicle._id,
        status: { $in: ["active", "pending"] },
      },
      { $set: { status: "completed" } }
    );

    tripsCreated += 1;
    bookingsModified += result.modifiedCount;
  }

  // Create trip even if empty? User said "write down in the trips".
  // If activeBookings is 0, maybe we should still record the trip?
  // Current logic only creates trip if there are bookings.
  // I will leave it as is unless "trip" implies movement regardless of passengers.
  // But usually empty runs might not be "Trips" in this system context or might be.
  // For now I'll stick to modifying the movement logic.

  // Determine destination station:
  // If we assume lineId is the line being traversed.
  // Usually the vehicle is at `fromStation` (or was).
  // Ideally, if currentStation is line.fromStation, go to line.toStation.
  // If currentStation is line.toStation, go to line.fromStation.
  // But reliable way is just use line.toStation if we consider "Line" as directional A->B.
  // If the admin selected the line A->B, and clicked reset, imply it arrived at B.

  // However, the selectedLineId in frontend is passed.
  // Let's assume the Line direction defines the movement.

  vehicle.currentStation = line.toStation;
  vehicle.currentStatus = "idle"; // Reset status to available/idle

  await vehicle.save();

  res.status(200).json({
    status: "success",
    message: `Reset completed for vehicle ${vichelId}`,
    data: {
      vehicleId: vehicle._id,
      tripsCreated,
      bookingsModified,
      currentStation: line.toStation,
      currentStatus: "idle",
    },
  });
});

exports.getVichelActiveTrip = asyncHandler(async (req, res, next) => {
  const { vichelId, stationId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(new Error("You are not authorized to view this vehicle", 401));
  }

  const vehicle = await VichelModel.findById(vichelId);
  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  const activeBookings = await Booking.find({
    vehicle: vichelId,
    status: "active",
  })
    .populate("user", "firstName lastName email phoneNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: activeBookings.length,
    data: {
      vehicle: {
        plateNumber: vehicle.plateNumber,
        capacity: vehicle.capacity,
        availableSeats: vehicle.capacity - activeBookings.length,
      },
      passengers: activeBookings,
    },
  });
});

exports.getVehicleTrips = asyncHandler(async (req, res, next) => {
  const { vichelId, stationId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(new Error("You are not authorized to view this vehicle", 401));
  }

  const vehicle = await VichelModel.findById(vichelId);
  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  const trips = await Trip.find({ vehicle: vichelId })
    .populate({
      path: "bookings",
      populate: {
        path: "user",
        select: "firstName lastName email phoneNumber",
      },
    })
    .sort({ date: -1 });

  const groupedTrips = {};
  trips.forEach((trip) => {
    const dateKey = trip.date.toISOString().split("T")[0];
    if (!groupedTrips[dateKey]) {
      groupedTrips[dateKey] = {
        _id: dateKey,
        trips: [],
        totalPassengers: 0,
        tripCount: 0,
      };
    }
    groupedTrips[dateKey].trips.push(trip);
    groupedTrips[dateKey].totalPassengers += trip.passengerCount;
    groupedTrips[dateKey].tripCount += 1;
  });

  const resultValues = Object.values(groupedTrips).sort((a, b) =>
    b._id.localeCompare(a._id)
  );

  res.status(200).json({
    status: "success",
    results: resultValues.length,
    data: resultValues,
  });
});

exports.deleteVichel = asyncHandler(async (req, res, next) => {
  const { stationId, vichelId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(
      new Error("You are not authorized to delete this vehicle", 401)
    );
  }

  const vehicle = await VichelModel.findByIdAndDelete(vichelId);
  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Vehicle deleted successfully",
    data: vehicle,
  });
});

exports.updateVichel = asyncHandler(async (req, res, next) => {
  const { stationId, vichelId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(
      new Error("You are not authorized to update this vehicle", 403)
    );
  }

  const vehicle = await VichelModel.findByIdAndUpdate(vichelId, req.body, {
    new: true,
    runValidators: true,
  });

  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Vehicle updated successfully",
    data: vehicle,
  });
});
