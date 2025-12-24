const express = require("express");
const router = express.Router();
const conversation = require("../models/conversation");
const { createConversation } = require("../controller/chat.controllers");
const { getConversation } = require("../controller/chat.controllers");

router.route("/").post(createConversation);
router.route("/:userId").get(getConversation);
module.exports = router;
