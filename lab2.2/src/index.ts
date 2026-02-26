import "dotenv/config";
import {serve} from "@hono/node-server";
import {Hono} from "hono";
import "@/services/tg-bot.js";
import {registrationRouter} from "@/routes/registration-router";

type Variables = {
  reg_username: string;
  reg_2fa_secret: string;
};

const app = new Hono<{ Variables: Variables }>();

app.get("/ping", (c) => {
  return c.text("pong");
});

app.get("/info", (c) => {
  return c.html(
    '<a href="https://t.me/lab2_1_ivan_bot?start=auth">link to the bot</a>',
  );
});

app.route("/register", registrationRouter);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
