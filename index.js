require("dotenv").config();
const cors = require("cors");
const usersRouter = require("./routes/users.routes");
const routeStation = require("./routes/StationRoue");
const communityRoutes = require("./routes/community.routes");
const express = require("express");
const mongoose = require("mongoose");
const { ERROR } = require("./utils/httpStatusText");
const path = require("path");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      cb(null, origin);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", usersRouter);
app.use("/api/station", routeStation);
app.use("/api/community", communityRoutes);

mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("db started successfully");
});

app.use((req, res) => {
  res.status(404).json({
    status: "ERROR",
    message: "route not found",
  });
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: err.statusText || ERROR,
    message: err.message || "Internal Server Error",
    data: null,
    code: err.statusCode || 500,
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on port 5000");
});


