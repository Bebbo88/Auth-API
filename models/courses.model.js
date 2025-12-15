const mongoose = require("mongoose");
const coursesSchema = mongoose.Schema({
  title: { type: String, require: true },
  price: { type: Number, require: true },
});
module.exports = mongoose.model("Course", coursesSchema);
