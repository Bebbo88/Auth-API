const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String },
    text: { type: String },
    conversationId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
