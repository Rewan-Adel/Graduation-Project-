const router = require("express").Router();
const upload = require("../Helpers/multer");
const {
  signUp,
  verifyEmail,
  resendCode,
  completeSignup,
  setLocation,
  uploadImage,
  logIn,
  resetPassword,
  forgotPassword,
  logout,
  getUser,
  updateUser,
  deleteProfilePicture,
  deleteUser,
  changePassword,
  resendPassOtp,
  verifyPasswordOtp,
  logoutAll
} = require("../Controllers/authCtr");

const auth = require("../Middleware/auth");

router.post("/signup", signUp);
router.post("/login", logIn);

router.post("/verification/:id", auth, verifyEmail);
router.get("/resend-code/:id", auth, resendCode);

router.get("/logout", auth, logout);
router.get("/logout-all", auth, logoutAll);

router.post("/forgot-pass", forgotPassword);
router.patch("/reset-pass/:email", resetPassword);
router.post("/resend-pass-otp/:email", resendPassOtp);
router.post("/verify-pass-otp/:email", verifyPasswordOtp);

router.post("/upload-image", upload, auth, uploadImage);
router.post("/complete-signup", auth, completeSignup);
router.post("/location", auth, setLocation);

router.get("/get-user", auth, getUser);
router.patch("/update-user", auth, updateUser);
router.patch("/change-password", auth, changePassword);

router.delete("/delete-profile-picture", auth, deleteProfilePicture);
router.delete("/delete-user", auth, deleteUser);

module.exports = router;
