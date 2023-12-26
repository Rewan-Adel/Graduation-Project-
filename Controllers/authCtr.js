const User = require("../Models/User");
const asyncHandler = require("express-async-handler");
const appError = require("../Helpers/appError");
const { otpSending, resetPassEmail } = require("../Helpers/sendMail");
const cloudinary = require("../config/cloudinary");
const crypto = require("crypto");
const { uploadImage } = require("./globalFun");

const {
  signupValidation,
  completeSignupValidation,
  loginValidation,
  updateUserValidation,
} = require("../Validation/validation.js");

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
  let sending = otpSending(user, res, next);
  if (sending === "error") {
    await user.deleteOne();
    return next(new appError("Something went wrong", 500));
  }
  const token = await user.generateAuthToken();
  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
    user,
    token,
  });
});

exports.verifyEmail = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);
  if (!user) return next(new appError("User not found", 404));
  let otp = req.body.otp;
  if (otp !== user.otp)
    return next(new appError("Invalid verification code", 400));
  user.isVerified = true;
  user.otp = null;
  await user.save();

  return res.status(200).json({
    status: "success",
    user,
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
      new appError("You have exceeded the maximum number of attempts, try again later", 400)
    );
  }
  let sending = otpSending(user, res, next);
  if (sending === "error")
    return next(new appError("Something went wrong", 500));

  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
    user,
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
    user: req.user,
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

  await user.save();
  return res.status(200).json({
    status: "success",
    user,
  });
});

exports.uploadImage = uploadImage(User);

exports.logIn = asyncHandler(async (req, res, next) => {
  let { value, error } = loginValidation(req.body);
  let user = await User.findOne({ email: value.email });
  if (!user) return next(new appError("Invalid email or password", 400));

  let isPassMatch = await user.passwordMatch(value.password);
  if (!isPassMatch || error)
    return next(new appError("Invalid email or password", 400));

  let token = await user.generateAuthToken();
  res.json({
    status: "success",
    token,
    user,
  });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  let user = await User.findOne({ email: req.body.email });
  if (!user) return next(new appError("Invalid Email", 404));

  let token = crypto.randomBytes(4).toString("hex");
  user.resetToken = token;
  user.expireToken = Date.now() + 15 * 60 * 1000; //token will expire after 15 minutes
  await user.save();

  let link = `http://${req.headers.host}${req.baseUrl}/verify-token/${token}/${user._id}`;

  let sending = resetPassEmail(link, user, res, next);
  if (sending === "error") {
    return next(new appError("Something went wrong", 500));
  }

  return res.status(200).json({
    status: "success",
    message: "Verification code has been sent",
    user,
  });
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);
  if (!user) return next(new appError("User not found", 404));

  if (user.resetToken !== req.params.token || user.expireToken < Date.now())
    return next(new appError("Token has been expired", 400));

  if (req.body.password !== req.body.confirmPass)
    return next(new appError("Passwords do not match", 400));

  const password = req.body.password.trim();
  if (password.length < 8 || password.length > 50)
    return next(new appError("Password must be at least 8 characters", 400));

  user.password = password;
  user.resetToken = null;
  user.expireToken = null;

  await user.save();
  return res.status(200).json({
    status: "success",
    user,
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

  if(value.email || value.password) return next(new appError("You can't change your email or password from here", 400));

  for (let key in value) {
    user[key] = value[key];
  }
  await user.save();

  return res.status(200).json({
    status: "success",
    user,
  });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));
  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));

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

  if(user.image.public_id === 'iwonvcvpn6oidmyhezvh')
    return next(new appError("You don't have a profile picture", 400)
    );

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

exports.changePassword= asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);
  if (!user) return next(new appError("User not found", 404));
  if (!user.isVerified)
    return next(new appError("Please verify your email first", 400));

  const isPassMatch = await user.passwordMatch(req.body.oldPassword);
  if (!isPassMatch)
    return next(new appError("Old password is Invalid , please try again", 400));

  if (req.body.oldPassword === req.body.newPassword)
    return next(
      new appError("New password can't be the same as old password", 400)
    );

  if (req.body.newPassword !== req.body.confirmPass)
    return next(new appError("Passwords do not match", 400));

  const password = req.body.newPassword.trim();
  if (password.length < 8 || password.length > 50)
    return next(new appError("Password must be at least 8 characters", 400));

  user.password = password;
  await user.save();

  return res.status(200).json({
    status: "Changed success",
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
