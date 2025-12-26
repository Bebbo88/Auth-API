const asyncWrapper = require("../middlewares/asyncWrapper");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

const createConversation = asyncWrapper(async (req, res) => {
  const { senderId, receiverId } = req.body;

  if (!senderId || !receiverId) {
    return res.status(400).json({
      status: "fail",
      message: "senderId and receiverId are required",
    });
  }

  // ترتيب ثابت عشان نتفادى التكرار
  const members = [senderId, receiverId].sort();

  // دور على محادثة موجودة
  let conversation = await Conversation.findOne({ members });

  // لو مش موجودة، اعمل واحدة
  if (!conversation) {
    conversation = await Conversation.create({ members });
  }

  return res.status(200).json({
    status: "success",
    data: conversation,
  });
});

const getConversation = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const conversation = await Conversation.find({
    members: { $in: [userId] },
  }).populate("members", "firstName lastName avatar");
  res.status(200).json({
    status: "SUCCESS",
    data: conversation,
  });
});
const newMessage = asyncWrapper(async (req, res) => {
  const { conversationId, senderId, text } = req.body;
  const newMessage = await Message.create({
    conversationId,
    senderId,
    text,
  });
  await newMessage.save();

  // [NEW] Update the conversation's timestamp so it moves to top
  await Conversation.findByIdAndUpdate(conversationId, {
    updatedAt: new Date(),
  });

  res.status(201).json({
    status: "SUCCESS",
    data: newMessage,
  });
});

const getMessages = asyncWrapper(async (req, res) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversationId });
  res.status(200).json({
    status: "SUCCESS",
    data: messages,
  });
});

module.exports = {
  createConversation,
  getConversation,
  newMessage,
  getMessages,
};
