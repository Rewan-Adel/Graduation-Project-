const appError = require("./appError");
const asyncHandler = require("express-async-handler");
const User = require("../Models/User");


exports.isValidResetToken = asyncHandler(async (req, res, next) => {
  let token = req.params.token;

  let user = await User.findOne({
    $and: [
      { resetToken: token },
      {
        expireToken: {
          $gt: Date.now(),
        },
      },
    ],
  });

  if (!user) return next(new appError("Invalid token or expired", 404));
  return res.status(200).json({
    status: "success",
    message: "Valid token",
  });
});
