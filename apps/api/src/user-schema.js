import Joi from "joi";

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required(),
  username: Joi.string().trim().alphanum().min(3).max(30).required(),
  role: Joi.string().valid("admin", "operator", "kitchen").required(),
  password: Joi.string().min(12).required(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } }),
  role: Joi.string().valid("admin", "operator", "kitchen"),
  password: Joi.string().min(12),
}).min(1);
