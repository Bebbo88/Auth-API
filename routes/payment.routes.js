const express = require("express");
const {
  createCheckoutSession,
  webhookCheckout,
  confirmPayment,
} = require("../service/paymentService");
const VerifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.post("/checkout-session", VerifyToken, createCheckoutSession);
router.post("/confirm-payment", VerifyToken, confirmPayment);

// Webhook endpoint (should use raw body parser in index.js)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookCheckout
);

module.exports = router;
