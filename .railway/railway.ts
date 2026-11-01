import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "NextAnime-";
export default defineRailway(() => {
  const NextAnime = service("NextAnime-", {
    source: github("CarlosPuyana/NextAnime-", {
      branch: "main",
      checkSuites: false,
    }),
    build: {
      buildEnvironment: "V3",
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
      nixpacksPlan: { providers: ["...", "node"] },
    },
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 180,
    replicas: { "us-west2": 1 },
    deploy: { sleepApplication: true },
    networking: { privateNetworkEndpoint: "nextanime" },
  });

  return project("Server NextAnimeJS", {
    variables: { managed: false },
    resources: [NextAnime],
  });
});
