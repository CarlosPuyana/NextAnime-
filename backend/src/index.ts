import "dotenv/config";
import { createApp } from "./app.js";
import { ExperimentalRankingService } from "./groq/ranking.js";
const ranking = new ExperimentalRankingService();
const server = createApp(undefined, ranking).listen(
  Number(process.env.PORT) || 3000,
  "0.0.0.0",
  () => console.log("NextAnime API lista"),
);
process.on("SIGTERM", () => server.close(() => process.exit(0)));
if (process.env.GROQ_CONNECTIVITY_CHECK === "true") {
  void import("./groq/probe.js").then(({ probeGroq }) => probeGroq());
}
if (process.env.GROQ_RECOMMENDATION_CHECK === "true") {
  void import("./groq/live-check.js").then(({ checkGroqRecommendation }) => checkGroqRecommendation(ranking));
}
