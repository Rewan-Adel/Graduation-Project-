const Joi = require("joi");

exports.signupValidation = function (user) {
  const userSchema = Joi.object({
    username: Joi.string().min(6).required().normalize(),
    email: Joi.string()
      .email()
      .min(5)
      .max(50)
      .trim()
      .required()
      .messages({ "string.email": " Email must be a valid email." }),
    password: Joi.string()
      .min(8)
      .required()
      .messages({
        "string.min": " Enter at least 8 characters long.",
      })
      .trim(),
    confirmPass: Joi.valid(Joi.ref("password")).messages({
      "any.only": "Passwords do not match.",
    }),
  }).unknown();
  return userSchema.validate(user);
};
exports.completeSignupValidation = function (user) {
  const userSchema = Joi.object({
    firstName: Joi.string()
      .min(3)
      .required()
      .trim()
      .messages({ "string.min": "Enter at least 3 characters." }),
    lastName: Joi.string()
      .min(3)
      .required()
      .trim()
      .messages({ "string.min": "Enter at least 3 characters." }),
    phone: Joi.string()
      .min(11)
      .trim()
      .messages({ "phone.min": "Enter a valid phone number." }),
  }).unknown();
  return userSchema.validate(user);
};
exports.loginValidation = function (user) {
  const userSchema = Joi.object({
    email: Joi.string()
      .email()
      .min(5)
      .max(50)
      .trim()
      .required()
      .messages({ "string.email": "Email must be a valid email." }),
    password: Joi.string()
      .min(8)
      .required()
      .messages({
        "string.min": "Enter at least 8 characters long.",
      })
      .trim(),
  }).unknown();
  return userSchema.validate(user);
}