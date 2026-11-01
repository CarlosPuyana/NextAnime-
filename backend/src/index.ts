import "dotenv/config";
import { createApp } from "./app.js";
const server = createApp().listen(
  Number(process.env.PORT) || 3000,
  "0.0.0.0",
  () => console.log("NextAnime API lista"),
);
process.on("SIGTERM", () => server.close(() => process.exit(0)));
