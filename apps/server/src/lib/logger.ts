import { pino } from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: { production: "info", development: "debug", test: "silent" }[env.NODE_ENV],
  redact: ["req.headers.authorization", "req.headers.cookie"],
  ...(env.NODE_ENV === "development" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
