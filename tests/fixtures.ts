import type { Anime, Profile } from "../shared/types.js";
export const action = { id: 1, name: "Action" },
  romance = { id: 22, name: "Romance" },
  fantasy = { id: 10, name: "Fantasy" };
export function anime(id: number, extra: Partial<Anime> = {}): Anime {
  return {
    id,
    title: `Anime ${id}`,
    picture: null,
    synopsis: "A young hero explores a mysterious world and protects friends.",
    genres: [action],
    episodes: 12,
    year: 2024,
    mean: 8,
    format: "tv",
    duration: 1440,
    score: null,
    prequels: [],
    relationsKnown: true,
    ...extra,
  };
}
export const profile: Profile = {
  username: "SadPuyana",
  fetchedAt: "2026-11-01T12:00:00Z",
  anime: [
    anime(1, { status: "completed", score: 9 }),
    anime(2, { status: "completed", score: 10 }),
    anime(3, { status: "completed", score: 8 }),
    anime(4, { status: "completed", score: 2, genres: [romance] }),
    anime(5, { status: "completed", score: 3, genres: [romance] }),
    anime(6, { status: "completed", score: null }),
    anime(7, { status: "watching" }),
    anime(8, { status: "on_hold" }),
    anime(9, { status: "dropped" }),
    ...Array.from({ length: 30 }, (_, i) =>
      anime(100 + i, {
        status: "plan_to_watch",
        genres: i % 2 ? [action] : [fantasy],
      }),
    ),
  ],
};
export const discoveries = Array.from({ length: 35 }, (_, i) =>
  anime(200 + i, { genres: i % 2 ? [romance] : [action] }),
);
