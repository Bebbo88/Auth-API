const express = require("express");
const {
  createCheckoutSession,
  webhookCheckout,
} = require("../service/paymentService");
const VerifyToken = require("../middlewares/verifyToken");

const router = express.Router();

router.post("/checkout-session", VerifyToken, createCheckoutSession);

// Webhook endpoint (should use raw body parser in index.js)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookCheckout
);

module.exports = router;
