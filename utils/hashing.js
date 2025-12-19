const crypto = require("crypto");
const hashing = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

module.exports = hashing;
