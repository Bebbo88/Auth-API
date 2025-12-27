require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const cron = require("node-cron");
const usersRouter = require("./routes/users.routes");
const routeStation = require("./routes/StationRoue");
const communityRoutes = require("./routes/community.routes");
const conversationRoutes = require("./routes/conversation.routes");
const messageRoutes = require("./routes/messages.routes");
const { ERROR } = require("./utils/httpStatusText");
const { Server } = require("socket.io");
const app = express();
const Booking = require("./models/booking.model");


/* ===============================
   MIDDLEWARES
================================ */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===============================
   ROUTES
================================ */
app.use("/api/auth", usersRouter);
app.use("/api/station", routeStation);
app.use("/api/community", communityRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

/* ===============================
   DB CONNECTION
================================ */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB error:", err.message));

/* ===============================
   NOT FOUND
================================ */
app.use((req, res) => {
  res.status(404).json({
    status: "ERROR",
    message: "route not found",
  });
});

/* ===============================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: err.statusText || ERROR,
    message: err.message || "Internal Server Error",
    data: null,
    code: err.statusCode || 500,
  });
});

/* ===============================
   Cron Job
================================ */
cron.schedule("* * * * *", async () => {
  await Booking.updateMany(
    {
      status: "pending",
      expiresAt: { $lt: new Date() },
    },
    { status: "cancelled" }
  );
  console.log("Cancelled expired bookings");
});

/* ===============================
   SERVER
================================ */
const server = app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on port 5000");
});

/* ===============================
   SOCKET.IO
================================ */
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Online users => userId : socketId
let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

  /* ===== ADD USER ===== */
  socket.on("addUser", (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    io.emit("getOnlineUsers", [...onlineUsers.keys()]);
  });

  /* ===== SEND MESSAGE ===== */
  socket.on("sendMessage", ({ receiverId, message }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getMessage", message);
    }
  });

  /* ===== TYPING ===== */
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", senderId);
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userStoppedTyping", senderId);
    }
  });

  /* ===== DISCONNECT ===== */
  socket.on("disconnect", () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("getOnlineUsers", [...onlineUsers.keys()]);
    console.log("Socket disconnected:", socket.id);
  });
});

/* ===============================
   UNHANDLED REJECTION
================================ */
process.on("unhandledRejection", (error) => {
  console.error(" Unhandled Rejection:", error.message);
  server.close(() => process.exit(1));
});
