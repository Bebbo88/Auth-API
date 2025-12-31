const Line = require("../models/LinesModel");
const VichelModel = require("../models/vichelModel");
const Booking = require("../models/booking.model");
const appErrors = require("../utils/appErrors");
const mongoose = require("mongoose");
const station = require("../models/StationModel");

const asyncHandler = require("express-async-handler");

exports.addVichelToLine = asyncHandler(async (req, res, next) => {
  const { lineId, stationId } = req.params;
  const { plateNumber } = req.body;

  const stationData = await station.findById(stationId);

  if (!stationData) {
    return next(Error("Station not found", 404));
  }

  if (stationData.admin) {
    if (stationData.admin.toString() !== req.currentUser._id.toString()) {
      return next(Error("You are not authorized to add a vehicle", 401));
    }
  } else {
    return next(Error("This Station Doesnot Have Any Admin", 401));
  }

  // جلب الخط الأصلي والعكسي
  const line = await Line.findById(lineId);
  if (!line) {
    return next(Error("Line not found", 404));
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
    return next(new Error("This Car is already exist in this line", 400));
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
    data: { original: vichelDataOriginal, reverse: vichelDataReverse },
  });
});

exports.getAllVichelOfLine = asyncHandler(async (req, res) => {
  const { lineId } = req.params;
  const vichels = await VichelModel.find({ line: lineId })
    .populate({
      path: "line",
      select: "fromStation toStation",
      populate: [
        { path: "fromStation", select: "stationName" },
        { path: "toStation", select: "stationName" },
      ],
    })
    .lean();

  // Attach bookings count or users for each vehicle
  // Warning: Doing this in a loop can be performance heavy, but for MVP it's okay.
  // Better approach: Aggregate.
  // Let's attach just the count or basic info as before.

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

  res.status(200).json({ count: results.length, results });
});

exports.getVichelOfLine = asyncHandler(async (req, res) => {
  const { vichelId } = req.params;
  const vehicle = await VichelModel.findById(vichelId)
    .populate({
      path: "line",
      select: "fromStation toStation",
      populate: [
        { path: "fromStation", select: "stationName" },
        { path: "toStation", select: "stationName" },
      ],
    })
    .lean();

  if (vehicle) {
    const bookings = await Booking.find({
      vehicle: vehicle._id,
      status: "active",
    }).populate("user", "firstName lastName email phoneNumber");
    vehicle.bookedUsers = bookings.map((b) => b.user);
    vehicle.availableSeats = vehicle.capacity - bookings.length;
  }

  res.status(200).json({ data: vehicle, id: vichelId });
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

  const vehicle = await VichelModel.findById(vichelId);
  if (!vehicle) {
    return next(Error("Vehicle not found", 404));
  }
  if (vehicle.currentStatus !== "idle" && vehicle.currentStatus !== "loading") {
    return next(
      new Error("Vehicle is not available for booking right now", 400)
    );
  }

  // Count active bookings
  const activeBookingsCount = await Booking.countDocuments({
    vehicle: vichelId,
    status: { $in: ["active", "pending"] },
  });

  // Check capacity
  if (activeBookingsCount >= vehicle.capacity) {
    return next(new Error("No seats available", 400));
  }

  // Check if user already booked (Active booking)
  const existingBooking = await Booking.findOne({
    vehicle: vichelId,
    user: userId,
    status: { $in: ["active", "pending"] },
  });

  if (existingBooking) {
    return next(new Error("You have already booked a seat", 400));
  }
  const bookAnothervichel = await Booking.findOne({
    user: userId,
    status: { $in: ["pending"] },
  });
  if (bookAnothervichel) {
    return next(
      new Error("You have already booked a seat in another vichel", 400)
    );
  }

  // Get Line Price
  const line = await Line.findById(vehicle.line);
  const price = line ? line.price : 0;

  const newBooking = await Booking.create({
    user: userId,
    vehicle: vichelId,
    status: "pending",
    price: price, // Add price here
    expiresAt: new Date(Date.now() + 60 * 10000), // 10 minutes
  });

  // Populate user and vehicle details
  await newBooking.populate([
    { path: "user", select: "firstName lastName email" },
    { path: "vehicle", select: "model plateNumber driverName" },
  ]);

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

  res.json({ message: "Booking confirmed" });
});

exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const { vichelId } = req.params;
  const userId = req.currentUser._id;

  // Find active booking for this user and vehicle
  const booking = await Booking.findOne({
    vehicle: vichelId,
    user: userId,
    status: { $in: ["active", "pending"] },
  });

  if (!booking) {
    return next(new Error("No active booking found for this vehicle", 404));
  }

  // Mark as cancelled
  booking.status = "cancelled";
  await booking.save();
  await booking.populate([
    { path: "user", select: "firstName lastName email" },
    { path: "vehicle", select: "model plateNumber driverName" },
  ]);

  res.status(200).json({
    status: "success",
    message: "Booking canceled successfully",
    data: booking,
  });
});

const Trip = require("../models/trip.model"); // Ensure import at top

exports.resetVichelBookings = asyncHandler(async (req, res, next) => {
  const { stationId } = req.params;
  const { plateNumber } = req.query; // أو req.body حسب ما تحب

  // لو مش مبعت plateNumber
  if (!plateNumber) {
    return next(new Error("plateNumber is required to reset bookings", 400));
  }

  // التأكد من وجود المحطة و authorization
  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(new Error("You are not authorized to reset vehicles", 403));
  }

  // جلب كل العربيات بنفس plateNumber
  const vehicles = await VichelModel.find({ plateNumber });

  if (vehicles.length === 0) {
    return next(
      new Error(`No vehicles found with plateNumber ${plateNumber}`, 404)
    );
  }

  let totalModified = 0;
  let tripsCreated = 0;

  // Loop لكل عربية
  for (const vehicle of vehicles) {
    // جلب الحجوزات الفعالة
    const activeBookings = await Booking.find({
      vehicle: vehicle._id,
      status: "active",
    });

    if (activeBookings.length === 0) continue;

    // إنشاء سجل Trip
    await Trip.create({
      vehicle: vehicle._id,
      passengerCount: activeBookings.length,
      bookings: activeBookings.map((b) => b._id),
      date: new Date(),
    });

    // تحديث كل الحجوزات الفعالة لـ completed
    const result = await Booking.updateMany(
      { vehicle: vehicle._id, status: "active" },
      { $set: { status: "completed" } }
    );

    totalModified += result.modifiedCount;
    tripsCreated += 1;

    console.log(
      `[RESET ] Vehicle ${vehicle._id} reset. Bookings completed: ${result.modifiedCount}`
    );
  }

  res.status(200).json({
    status: "success",
    message: `Reset completed for ${vehicles.length} vehicles with plateNumber ${plateNumber}`,
    data: {
      vehiclesProcessed: vehicles.length,
      tripsCreated,
      bookingsModified: totalModified,
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
    return next(Error("You are not authorized to delete a vehicle", 401));
  }
  const vehicle = await VichelModel.findById(vichelId);
  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  // Find active bookings (Current Trip)
  const activeBookings = await Booking.find({
    vehicle: vichelId,
    status: "active",
  })
    .populate("user", "firstName lastName email phoneNumber")
    .sort({ createdAt: -1 });

  console.log(
    `[ACTIVE_TRIP] Vehicle ${vichelId}: Found ${activeBookings.length} active bookings.`
  );

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
    return next(Error("You are not authorized to delete a vehicle", 401));
  }

  const vehicle = await VichelModel.findById(vichelId);
  if (!vehicle) {
    return next(new Error("Vehicle not found", 404));
  }

  // Aggregate trips grouped by Date (YYYY-MM-DD)
  const trips = await Trip.find({
    vehicle: vichelId,
  })
    .populate({
      path: "bookings",
      populate: {
        path: "user",
        select: "firstName lastName email phoneNumber", // Select user fields
      },
    })
    .sort({ date: -1 });

  // Group by date manually (easier with populated data than aggregation)
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
  const { stationId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(Error("You are not authorized to delete a vehicle", 401));
  }

  const vehicle = await VichelModel.deleteMany({
    plateNumber: req.query.plateNumber,
  });
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
  const { stationId } = req.params;

  const stationData = await station.findById(stationId);
  if (!stationData) {
    return next(new Error("Station not found", 404));
  }

  if (stationData.admin.toString() !== req.currentUser._id.toString()) {
    return next(
      new Error("You are not authorized to update this vehicle", 403)
    );
  }

  const vehicle = await VichelModel.updateMany(
    { plateNumber: req.query.plateNumber },
    req.body,
    { new: true, runValidators: true }
  );

  if (!vehicle) {
    return next(new Error(`${req.query.plateNumber} Vehicle not found `, 404));
  }

  res.status(200).json({
    status: "success",
    message: "Vehicle updated successfully",
    data: vehicle,
  });
});
