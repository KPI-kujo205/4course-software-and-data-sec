import {Hono} from "hono";
import {verify} from "hono/jwt";
import {verifyRegistration} from "@/middlewares/registration-authorization-middleware";
import zodValidatorMiddleware from "@/middlewares/zod-validator-middleware";
import {Step1Schema, Step2Schema, Step3Schema} from "@/schemas";
import {sendMessageToUser} from "@/services/tg-bot";
import {
  createUser,
  generateOtpStoreInDb,
  getTgUserIdByUsername,
  verifyOtpInDb,
} from "@/services/users-service";
import {hashPassword} from "@/utils/bcrypt";
import {generateQRCode} from "@/utils/otp";
import {createRegToken} from "@/utils/registration-jwt";

type Variables = {
  reg_username: string;
  reg_2fa_secret: string;
};

const registrationRouter = new Hono<{ Variables: Variables }>();

registrationRouter
  .post("/step1", zodValidatorMiddleware("json", Step1Schema), async (c) => {
    const {tg_username} = c.req.valid("json");

    const userRes = await getTgUserIdByUsername(tg_username);

    if (userRes.isErr()) {
      return c.json(
        {
          error:
            "User not found, make sure you visited https://t.me/lab2_1_ivan_bot?start=auth",
        },
        404,
      );
    }

    const otpRes = await generateOtpStoreInDb(tg_username);

    if (otpRes.isErr()) {
      return c.json({error: "Failed to generate OTP, try later"}, 500);
    }

    await sendMessageToUser(
      Number(userRes.value),
      `Your OTP code: ${otpRes.value}\n\nIt expires in 10 minutes. Don't report it to anyone!`,
    );

    return c.json(
      "OTP code sent to your Telegram, please check and proceed to step 2",
    );
  })
  .post("/step2", zodValidatorMiddleware("json", Step2Schema), async (c) => {
    const {tg_username, code} = c.req.valid("json");

    const verificationResult = await verifyOtpInDb(tg_username, code);

    if (verificationResult.isErr()) {
      return c.json({error: verificationResult.error}, 400);
    }

    const tokenResult = await createRegToken(tg_username);

    return tokenResult.match(
      (token) => {
        return c.json({
          success: true,
          registrationToken: token,
        });
      },
      (err) => c.json({error: err}, 500),
    );
  })
  .post(
    "/step3",
    verifyRegistration,
    zodValidatorMiddleware("json", Step3Schema),
    async (c) => {
      const body = c.req.valid("json");

      const hashedPassword = await hashPassword(body.password);
      const hashedPin = await hashPassword(body.pin);

      const res = await createUser({
        tg_username: c.get("reg_username"),
        reg_2fa_secret: c.get("reg_2fa_secret"),
        password_hash: hashedPassword,
        two_fa_token: body.two_fa_token,
        pin: hashedPin,
      });

      if (res.isOk()) {
        return c.json({
          success: true,
          message: "Registration completed successfully",
        });
      } else {
        return c.json({error: res.error}, 400);
      }
    },
  )
  .get("/2fa/setup", verifyRegistration, async (c) => {
    const reg_username = c.get("reg_username");
    const reg_2fa_secret = c.get("reg_2fa_secret");

    const qrCodeBuffer = await generateQRCode(reg_username, reg_2fa_secret);

    if (qrCodeBuffer.isOk()) {
      const buffer = qrCodeBuffer.value;

      const uint8Array = new Uint8Array(buffer);

      return c.newResponse(uint8Array, 200, {
        "Content-Type": "image/png",
        "Content-Length": uint8Array.length.toString(),
      });
    }

    return c.json({error: qrCodeBuffer.error}, 500);
  });

export {registrationRouter};
