import {Hono} from "hono";
import {verifySession} from "@/middlewares/session-authorization-middleware";
import zodValidatorMiddleware from "@/middlewares/zod-validator-middleware";
import {LoginSchema, PinSchema} from "@/schemas";
import type {SessionPayload} from "@/utils/session-jwt";

type Variables = {
  session: SessionPayload;
};

const authenticationRouter = new Hono<{ Variables: Variables }>();

authenticationRouter
  .post(
    "/login",
    zodValidatorMiddleware("json", LoginSchema),
    async (req, res) => {
    },
  )
  .post(
    "/verify-pin",
    zodValidatorMiddleware("json", PinSchema),
    verifySession,
    async (req, res) => {
    },
  );

export {authenticationRouter};
