import {Hono} from "hono";
import {verify} from "otplib";
import {verifySession} from "@/middlewares/session-authorization-middleware";
import zodValidatorMiddleware from "@/middlewares/zod-validator-middleware";
import {
  LoginSchema,
  PinSchema,
  ResetPasswordSchema,
  SendOtpSchema,
} from "@/schemas";
import {sendMessageToUser} from "@/services/tg-bot";
import {
  changeUserPassword,
  generateOtpStoreInDb,
  getUserByUsername,
  verifyOtpInDb,
} from "@/services/users-service";
import {verifyPassword} from "@/utils/bcrypt";
import {createSessionToken, type SessionPayload} from "@/utils/session-jwt";

type Variables = {
  session: SessionPayload;
};

const authenticationRouter = new Hono<{ Variables: Variables }>();

authenticationRouter
  .post("/login", zodValidatorMiddleware("json", LoginSchema), async (c) => {
    const body = c.req.valid("json");

    const getUserRes = await getUserByUsername(body.tg_username);

    if (getUserRes.isErr()) {
      return c.json(
        {error: "User has no password set, please contact support"},
        400,
      );
    }

    const user = getUserRes.value;

    if (!user.password_hash) {
      return c.json(
        {error: "User has no password set, please contact support"},
        400,
      );
    }

    const passValid = await verifyPassword(body.password, user.password_hash);

    const is2faValid = await verify({
      secret: String(user.two_fa_secret),
      token: body.two_fa_code,
    });

    if (!passValid || !is2faValid.valid) {
      return c.json({error: "Invalid credentials"}, 401);
    }

    const tokenResult = await createSessionToken(user.id, user.tg_username);

    if (tokenResult.isErr()) {
      return c.json({error: "Failed to create session"}, 500);
    }

    return c.json({token: tokenResult.value});
  })
  .post(
    "/verify-pin",
    zodValidatorMiddleware("json", PinSchema),
    verifySession,
    async (c) => {
      const pin = c.req.valid("json").pin;

      const userRes = await getUserByUsername(c.get("session").tg_username);

      if (userRes.isErr()) return c.json({error: "User not found"}, 404);

      if (!userRes.value.pin)
        return c.json({
          error: "PIN not set for user, please contact support",
        });

      const pinCorrect = await verifyPassword(pin, userRes?.value?.pin);

      if (!pinCorrect) {
        return c.json(
          {
            error: "Incorrect PIN",
          },
          403,
        );
      }

      const sessionToken = await createSessionToken(
        userRes.value.id,
        userRes.value.tg_username,
      );

      if (sessionToken.isOk()) {
        return c.json({
          token: sessionToken.value,
        });
      }
    },
  )
  .get("/me", verifySession, async (c) => {
    return c.text(
      "Hello, you entered protected route! Your session info: \n" +
      JSON.stringify(c.get("session")),
    );
  })
  .post(
    "/send-recovery-opt",
    zodValidatorMiddleware("json", SendOtpSchema),
    async (c) => {
      const tgUsername = c.req.valid("json").tg_username;

      const userRes = await getUserByUsername(tgUsername);

      const otpRes = await generateOtpStoreInDb(tgUsername, "reset");

      if (otpRes.isErr()) {
        return c.json({error: "Failed to generate OTP, try later"}, 500);
      }

      if (userRes.isErr()) {
        return c.json({error: "User not found"}, 400);
      }

      await sendMessageToUser(
        Number(userRes.value.tg_user_id),
        `Your password recovery code: ${otpRes.value}\n\nIt expires in 10 minutes. If you didn't initialize recovery process please follow a link!`,
      );

      return c.json({
        success: true,
      });
    },
  )
  .post(
    "/recover-password",
    zodValidatorMiddleware("json", ResetPasswordSchema),
    async (c) => {
      const body = c.req.valid("json");
      const userRes = await getUserByUsername(body.tg_username);

      if (userRes.isErr()) {
        return c.json({error: "User not found"}, 400);
      }

      const verificationResult = await verifyOtpInDb(
        body.tg_username,
        body.otp_code,
        "reset",
      );

      const pinCorrect = await verifyPassword(body.pin, userRes.value.pin!);

      if (!pinCorrect) {
        return c.json(
          {
            error: "Incorrect PIN",
          },
          403,
        );
      }

      if (verificationResult.isErr()) {
        return c.json({error: verificationResult.error}, 400);
      }

      const res = await changeUserPassword({
        userId: userRes.value.id,
        newPasswordUnhashed: body.new_password,
      });

      if (res.isErr()) {
        return c.json({error: res.error}, 500);
      } else {
        return c.json({
          success: true,
          message: "Password changed successfully",
        });
      }
    },
  );

export {authenticationRouter};
