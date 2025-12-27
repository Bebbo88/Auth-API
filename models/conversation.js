const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
<<<<<<< HEAD
  { members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] },
=======
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
>>>>>>> 032772cdb6bd88b3b7ec33c82508eb9ebdd6397a
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
