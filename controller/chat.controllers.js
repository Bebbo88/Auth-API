const asyncWrapper = require("../middlewares/asyncWrapper");
const Conversation = require("../models/conversation");
const Message = require("../models/message");

const createConversation = asyncWrapper(async (req, res) => {
  const { senderId, receiverId } = req.body;
  const newConversation = await Conversation.create({
    members: [senderId, receiverId],
  });
  await newConversation.save();
  res.status(201).json({
    status: "SUCCESS",
    data: newConversation,
  });
});

const getConversation = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const conversation = await Conversation.find({
    members: { $in: [userId] },
  });
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
