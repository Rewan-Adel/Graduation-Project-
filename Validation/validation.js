const Joi = require("joi");
const errorUpdate = require("./error-update.js");

exports.signupValidation = function (user) {
  const userSchema = Joi.object({
    username: Joi.string()
      .regex(/^[a-zA-Z0-9._]+$/)
      .min(6)
      .max(25)
      .required()
      .normalize()
      .messages({
        "string.pattern.base":
          "Username must consist of alphanumeric characters only",
      }).lowercase().trim(),
    email: Joi.string().email().min(5).max(50).trim().required(),
    password: Joi.string().min(8).required().trim(),
    confirmPass: Joi.valid(Joi.ref("password")).messages({
      "any.only": "Passwords do not match",
    }),
  }).unknown();
  let { error, value } = userSchema.validate(user);
  if (error) error = errorUpdate(error);
  return { value, error };
};

exports.completeSignupValidation = function (user) {
  const userSchema = Joi.object({
    firstName: Joi.string()
      .pattern(/^[a-zA-Z\s-]+$/)
      .min(2)
      .max(30)
      .required()
      .trim()
      .messages({ "string.pattern.base": "Name must be letters only" }),
    lastName: Joi.string()
      .pattern(/^[a-zA-Z\s-]+$/)
      .min(2)
      .max(30)
      .required()
      .trim()
      .messages({ "string.pattern.base": "Name must be letters only" }),
    phone: Joi.string().min(11).trim(),
  }).unknown();
  let { error, value } = userSchema.validate(user);
  if (error) error = errorUpdate(error);
  return { value, error };
};

exports.loginValidation = function (user) {
  const userSchema = Joi.object({
    email: Joi.string().email().min(5).max(50).trim().required(),
    password: Joi.string().min(8).required().trim(),
  }).unknown();
  let { error, value } = userSchema.validate(user);
  if (error) error = errorUpdate(error);
  return { value, error };
};
