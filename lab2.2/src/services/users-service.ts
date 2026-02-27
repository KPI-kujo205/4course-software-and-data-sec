import {err, fromPromise, ok, ResultAsync} from "neverthrow";
import {verify} from "otplib";
import {db} from "@/db";
import {generateOTP} from "@/utils/otp";

export function rememberUserIdAndTag(
  tg_username?: string,
  tg_user_id?: number,
) {
  if (!tg_user_id) {
    return err("tg_user_id is required here");
  }

  if (!tg_username) {
    return err("tg_username is required here");
  }

  const promise = db
    .insertInto("users")
    .values({
      tg_user_id: BigInt(tg_user_id),
      tg_username: tg_username,
    })
    .onConflict((oc) => {
      return oc.column("tg_username").doUpdateSet({
        tg_username: tg_username,
        tg_user_id: BigInt(tg_user_id),
      });
    })
    .execute();

  return fromPromise(promise, (error) => {
    return error;
  });
}

export function verifyOtpInDb(tg_username: string, code: string) {
  return ResultAsync.fromPromise(
    db
      .selectFrom("verification_codes")
      .selectAll()
      .where("tg_username", "=", tg_username)
      .where("code", "=", code)
      .where("expires_at", ">", new Date())
      .executeTakeFirst(),
    (e) => new Error(`DATABASE_ERROR: ${(e as Error).message}`),
  ).andThen((record) => {
    if (!record) {
      return err("code not found or expired");
    }
    return ok(true);
  });
}

export function getTgUserIdByUsername(tg_username: string) {
  return ResultAsync.fromPromise(
    db
      .selectFrom("users")
      .select("tg_user_id")
      .where("tg_username", "=", tg_username)
      .executeTakeFirst(),
    (e) => new Error(`DATABASE_ERROR: ${(e as Error).message}`),
  ).andThen((record) => {
    if (!record) {
      return err("User not found");
    }
    return ok(record.tg_user_id);
  });
}

export function generateOtpStoreInDb(tg_username: string) {
  const otp = generateOTP();

  return ResultAsync.fromPromise(
    db
      .insertInto("verification_codes")
      .values({
        tg_username,
        code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      })
      .execute(),
    (e) => new Error(`DATABASE_ERROR: ${(e as Error).message}`),
  ).map(() => otp);
}

interface TCreateUser {
  tg_username: string;
  reg_2fa_secret: string;

  password_hash: string;
  two_fa_token: string;

  pin: string;
}

export async function createUser(inputs: TCreateUser) {
  const {valid} = await verify({
    secret: inputs.reg_2fa_secret,
    token: inputs.two_fa_token,
  });

  if (!valid) {
    console.error("2FA verification failed for user:", inputs.tg_username);
    return err("Wrong 2FA. Check app and try again.");
  }

  console.log("Inserting user data", inputs);

  return ResultAsync.fromPromise(
    db
      .insertInto("users")
      .values({
        pin: inputs.pin,
        tg_username: inputs.tg_username,
        password_hash: inputs.password_hash,
        two_fa_secret: inputs.reg_2fa_secret,
        is_verified: true,
        created_at: new Date(),
      })
      .onConflict((onc) =>
        onc.column("tg_username").doUpdateSet({
          pin: inputs.pin,
          tg_username: inputs.tg_username,
          password_hash: inputs.password_hash,
          two_fa_secret: inputs.reg_2fa_secret,
          is_verified: true,
          created_at: new Date(),
        }),
      )
      .execute(),
    (error) => {
      console.error("Error inserting user");
      return error;
    },
  );
}

export async function getUserByUsername(tg_username: string) {
  return ResultAsync.fromPromise(
    db
      .selectFrom("users")
      .select([
        "id",
        "tg_username",
        "password_hash",
        "two_fa_secret",
        "is_verified",
        "pin",
      ])
      .where("tg_username", "=", tg_username)
      .executeTakeFirst(),
    (e) => new Error(`DATABASE_ERROR: ${(e as Error).message}`),
  ).andThen((record) => {
    if (!record) {
      return err("User not found");
    }
    return ok(record);
  });
}
