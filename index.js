require("dotenv").config();
const cors = require("cors");
const coursesRouter = require("./routes/courses.routes");
const usersRouter = require("./routes/users.routes");
const express = require("express");
const mongoose = require("mongoose");
const { ERROR } = require("./utils/httpStatusText");
const path = require("path");




const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads",express.static(path.join(__dirname,"uploads")))
app.use("/api/courses", coursesRouter);
app.use("/api/users", usersRouter);
const url = process.env.MONGO_URL;
mongoose.connect(url).then(() => {
  console.log("db started successfully");
});
app.use((req, res) => {
  res.status(404).json({
    status: "ERROR",
    message: "Route Not Found",
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
