const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const protect = asyncHandler(async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const authHeader = req.headers["authorization"];
      var token = authHeader && authHeader.split(" ")[1];
      console.log(token);
      if (token == null) {
        return res.status(400).json({
          err: "invalid token",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("password");
      next();
    } catch (error) {
      console.log(error);
      res.status(401);
      throw new Error("Not authorized,token failed");
    }
  }
  if (!token) {
    res.status(401);
    throw new Error("token field is empty");
  }
});

module.exports = { protect };
