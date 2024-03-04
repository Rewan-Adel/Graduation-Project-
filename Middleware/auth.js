const jwt = require("jsonwebtoken");
const appError = require("../Helpers/appError");
const User = require("../Models/User.js");
const asyncHandler = require("express-async-handler");

module.exports = asyncHandler(async (req, res, next) => {
  if (!req.header("Authorization"))
    return next(new appError("Please login to get access", 401));
  
  const token = req.header("Authorization").replace("Bearer ", "");
  if (!token) return next(new appError("Please login to get access", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded) return next(new appError("Invalid token", 404));

  const user = await User.findOne({
    _id: decoded._id,
    "tokens.token": token,
  });
  
  if (!user) return next(new appError("Invalid token or not verified", 404));
  // if (!user.isVerified) return next(new appError("Please verify your email", 401));

  req.token = token;
  req.user = user;
  next();
});
