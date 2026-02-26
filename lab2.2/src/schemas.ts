import {z} from "zod";

const pinSchema = z
  .string()
  .length(4, "PIN must be 4 digits")
  .regex(/^\d+$/, "Only numbers");

export const Step1Schema = z.object({
  tg_username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
});

export const Step2Schema = z.object({
  tg_username: z.string(),
  code: z.string().length(6).regex(/^\d+$/),
});

export const Step3Schema = z.object({
  password: z.string().min(8),
  two_fa_token: z.string().length(6),
  pin: pinSchema,
});

export const LoginSchema = z.object({
  tg_username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password too short"),
  two_fa_code: z.string().length(6, "Must be 6 digits"),
});

export const PinSchema = z.object({
  pin: pinSchema,
});
