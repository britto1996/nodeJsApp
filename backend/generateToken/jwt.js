const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_AUTH_TOKEN, {
    algorithm: "HS256",
    expiresIn: "30d",
  });
};

module.exports = generateToken;
