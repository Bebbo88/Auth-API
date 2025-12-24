const express = require("express");
const router = express.Router();
const message = require("../models/message");
const { newMessage, getMessages } = require("../controller/chat.controllers");

router.route("/").post(newMessage);
router.route("/:conversationId").get(getMessages);
module.exports = router;
