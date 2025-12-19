const jwt = require("jsonwebtoken");

const generateTokens = (payload) => {
  const token = jwt.sign(
    {
      id: payload.id,
      role: payload.role,
    },
    process.env.JWT_SECRET_KEY
    // { expiresIn: "1h" }
  );
  return token;
};
module.exports = generateTokens;
