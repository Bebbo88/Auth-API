const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/booking.model");
const asyncHandler = require("express-async-handler");
const appErrors = require("../utils/appErrors");

exports.createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId).populate("vehicle user");
  if (!booking) {
    return next(new appErrors.create("Booking not found", 404));
  }

  if (booking.status !== "pending") {
    return next(
      new appErrors.create("Booking is already processed or cancelled", 400)
    );
  }

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    success_url: `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
    cancel_url: `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/stations`,
    customer_email: booking.user.email,
    client_reference_id: bookingId.toString(),
    line_items: [
      {
        price_data: {
          currency: "egp",
          product_data: {
            name: `حجز مقعد - ${booking.vehicle.plateNumber}`,
            description: `حجز مقعد في عربية ${booking.vehicle.model} - لوحة ${booking.vehicle.plateNumber}`,
          },
          unit_amount: booking.price * 100, // Stripe expects amount in cents
        },
        quantity: 1,
      },
    ],
  });

  res.status(200).json({
    status: "success",
    session_url: session.url,
  });
});

exports.webhookCheckout = asyncHandler(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.client_reference_id;

    // Update booking status to active
    await Booking.findByIdAndUpdate(bookingId, {
      status: "active",
      expiresAt: null,
    });
  }

  res.status(200).json({ received: true });
});
