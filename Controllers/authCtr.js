const User = require("../Models/User.js");
const asyncHandler = require("express-async-handler");
const appError = require("../Helpers/appError.js");
const { otpSending, resetPassEmail } = require("../Helpers/sendMail.js");
const cloudinary = require("../config/cloudinary.js");
const crypto = require("crypto");
const { uploadImage } = require("./globalFun");
const getLoc = require("../Helpers/getLocation.js");
const {
  signupValidation,
  completeSignupValidation,
  loginValidation,
  updateUserValidation,
  resetPasswordValidation,
} = require("../Validation/auth.validation.js");

exports.signUp = asyncHandler(async (req, res, next) => {
  let { value, error } = signupValidation(req.body);
  if (error) return next(new appError(error, 400));
  let user = await User.findOne({ username: value.username });
  if (user) error = "Username already exists.";

  if (!error) {
    user = await User.findOne({ email: value.email });
    if (user) error = "Email already exists.";
  }
  if (error) return next(new appError(error, 400));

  user = await User.create(value);
  user.image.url =
    "https://res.cloudinary.com/dgslxtxg8/image/upload/v1703609152/iwonvcvpn6oidmyhezvh.jpg";
  user.image.public_id = "iwonvcvpn6oidmyhezvh";
  await user.save();
  let sending = await otpSending(user, res, next);
  if (sending === "error") {
    await user.deleteOne();
    return next(new appError("Something went wrong", 500));
  }
  const token = await user.generateAuthToken();
  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
    token,
    user
  });
});

exports.verifyEmail = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);
  if (!user) return next(new appError("User not found", 404));
  let otp = Number(req.body.otp);
  if (otp !== user.otp)
    return next(new appError("Invalid verification code", 400));
  user.isVerified = true;
  user.otp = null;
  await user.save();

  return res.status(200).json({
    status: "success",
    message: "Email has been verified.",
  });
});

exports.resendCode = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);
  if (!user) return next(new appError("User not found", 404));
  if (user.isVerified)
    return next(new appError("You have already verified your email", 400));
  user.counter++;

  if (user.counter > 5) {
    setTimeout(() => {
      user.counter = 0;
      user.save();
    }, 10 * 60 * 1000);
    return next(
      new appError(
        "You have exceeded the maximum number of attempts, try again later",
        400
      )
    );
  }
  let sending = await otpSending(user, res, next);
  if (sending === "error")
    return next(new appError("Something went wrong", 500));

  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
  });
});

exports.completeSignup = asyncHandler(async (req, res, next) => {
  const { value, error } = completeSignupValidation(req.body);
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));

  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));
  if (error) return next(new appError(error, 400));

  user.firstName = value.firstName;
  user.lastName = value.lastName;
  user.phone = value.phone;
  user.gender = value.gender;
  await user.save();
  return res.status(200).json({
    status: "success",
    token: req.token,
  });
});

exports.setLocation = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));

  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));
  const longitude = req.query.longitude;
  const latitude = req.query.latitude;
  if (!longitude || !latitude)
    return next(new appError("Please provide a valid location", 400));
  user.location = {
    longitude: Number(longitude),
    latitude: Number(latitude),
  };
  const location = await getLoc(latitude, longitude);

  for (let key in location) {
    user.location[key] = location[key];
  }
  await user.save();
  return res.status(200).json({
    status: "success",
    location,
  });
});

exports.uploadImage = uploadImage(User);

exports.logIn = asyncHandler(async (req, res, next) => {
  let { value, error } = loginValidation(req.body);
  if (error) return next(new appError(error, 400));

  let user = await User.findOne({ email: value.email });
  if (!user) user = await User.findOne({ username: value.email });
  if (!user) return next(new appError("Invalid email, username, or password", 400));

  let isPassMatch = await user.passwordMatch(value.password);
  if (!isPassMatch || error)
    return next(new appError("Invalid email, username, or password", 400));

  let token = await user.generateAuthToken();
  res.json({
    status: "success",
    message: "Logged in successfully",
    token,
    user:{
      isVerified:user.isVerified
    }
  });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email.toLowerCase().trim();

  let user = await User.findOne({ email });
  if (!user) return next(new appError("Invalid Email", 404));

  let sending = await resetPassEmail(user, res, next);
  if (sending === "error") {
    return next(new appError("Something went wrong", 500));
  }

  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
  });
});

exports.verifyPasswordOtp = asyncHandler(async (req, res, next) => {
  const email = req.params.email.toLowerCase().trim();
  let user = await User.findOne({ email });

  if (!user) return next(new appError("User not found", 404));

  let otp = Number(req.body.otp);

  if (user.passwordOtp.otp !== otp)
    return next(new appError("Otp is not correct.", 400));

  user.passwordOtp.isVerified = true;
  await user.save();

  return res.status(200).json({
    status: "success",
    message: "Verification succeed.",
  });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const email = req.params.email.toLowerCase().trim();
  let user = await User.findOne({ email });

  if (!user) return next(new appError("User not found", 404));

  if (!user.passwordOtp.isVerified)
    return next(new appError("Please verify reset Password.", 400));

  const { value, error } = resetPasswordValidation(req.body);
  const password = value.password;

  if (error) return next(new appError(error, 400));

  const isPassMatch = await user.passwordMatch(password);
  if (isPassMatch)
    return next(
      new appError("New password can't be the same as old password", 400)
    );

  user.password = password;
  user.passwordOtp.isVerified = false;
  user.passwordOtp.otp = null;

  await user.save();
  return res.status(200).json({
    status: "success",
    message: "Password has been reset",
  });
});

exports.resendPassOtp = asyncHandler(async (req, res, next) => {
  const email = req.params.email.toLowerCase().trim();

  let user = await User.findOne({ email });
  if (!user) return next(new appError("Invalid Email", 404));

  let sending = await resetPassEmail(user, res, next);
  if (sending === "error") {
    return next(new appError("Something went wrong", 500));
  }

  user.counter++;

  if (user.counter > 5) {
    setTimeout(() => {
      user.counter = 0;
      user.save();
    }, 10 * 60 * 1000);
    return next(
      new appError(
        "You have exceeded the maximum number of attempts, try again later",
        400
      )
    );
  }

  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
  });
});

exports.changePassword = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));
  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));

  const isPassMatch = await user.passwordMatch(req.body.oldPassword);
  if (!isPassMatch)
    return next(
      new appError("Old password is Invalid , please try again", 400)
    );

  if (req.body.oldPassword === req.body.newPassword)
    return next(
      new appError("New password can't be the same as old password", 400)
    );

  req.body.password = req.body.newPassword;
  const { value, error } = resetPasswordValidation(req.body);
  if (error) return next(new appError(error, 400));

  const password = value.password;

  user.password = password;
  await user.save();

  return res.status(200).json({
    status: "success",
    message: "Password has been changed",
  });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  const { value, error } = updateUserValidation(req.body);
  if (error) return next(new appError(error, 400));

  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));
  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));

  if (value.username) {
    let checkUser = await User.findOne({ username: value.username });
    if (checkUser && checkUser._id.toString() !== user._id.toString())
      return next(new appError("Username already exists", 400));
  }

  if (value.email || value.password)
    return next(
      new appError("You can't change your email or password from here", 400)
    );

  for (let key in value) {
    user[key] = value[key];
  }
  await user.save();

  return res.status(200).json({
    status: "success",
    user,
    message: "Profile has been updated",
  });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));

  return res.status(200).json({
    status: "success",
    user,
    wishList: user.wishlist,
  });
});

exports.deleteProfilePicture = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));
  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));

  if (user.image.public_id === "iwonvcvpn6oidmyhezvh")
    return next(new appError("You don't have a profile picture", 400));

  await cloudinary.uploader.destroy(user.image.public_id);

  user.image.url =
    "https://res.cloudinary.com/dgslxtxg8/image/upload/v1703609152/iwonvcvpn6oidmyhezvh.jpg";
  user.image.public_id = "iwonvcvpn6oidmyhezvh";
  await user.save();
  return res.status(200).json({
    status: "Updating success",
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));
  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));

  const isPassMatch = await user.passwordMatch(req.body.password);
  if (!isPassMatch)
    return next(new appError("Invalid password, please try again", 400));

  await user.deleteOne();
  return res.status(200).json({
    status: "Deleted success",
  });
});

exports.logout = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  user.tokens = user.tokens.filter((token) => token.token !== req.token);
  await user.save();
  return res.status(200).json({
    status: "success",
  });
});

exports.logoutAll = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  user.tokens = [];
  await user.save();
  return res.status(200).json({
    status: "success",
  });
});
