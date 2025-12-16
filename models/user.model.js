const mongoose = require("mongoose");
const validator = require("validator");
const userRoles = require("../utils/userRoles");
const userSchema = mongoose.Schema({
  firstName: { type: String, require: true },
  lastName: { type: String, require: true },
  email: { type: String, require: true , unique: true , validate: { validator:  validator.isEmail, message: "Please enter a valid email" } },
  password: { type: String, require: true },
  // token:{type:String},
  role:{type:String,enum:[userRoles.ADMIN,userRoles.USER,userRoles.MANAGER],default:userRoles.USER},
  avatar:{type:String , default:"uploads/profile.jpg"}
});
module.exports = mongoose.model("User", userSchema);
