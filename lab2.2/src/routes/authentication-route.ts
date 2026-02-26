import {Hono} from "hono";

type Variables = {};

const authenticationRouter = new Hono<{ Variables: Variables }>();

authenticationRouter.post("/login", async (req, res) => {
});
