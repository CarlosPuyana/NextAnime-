export type ProfileMotif =
  "magic" | "botanical" | "music" | "ocean" | "neutral";
export interface ProfileIdentity {
  id: string;
  displayName: string;
  malUsername: string | null;
  subtitle: string;
  tagline: string;
  description: string;
  inspirations: string[];
  palette: {
    primary: string;
    secondary: string;
    surface: string;
    onAccent: string;
  };
  accentColor: string;
  avatarAsset: string | null;
  heroAsset: string;
  decorativeTokens: {
    motif: ProfileMotif;
    symbol: string;
    portraitPosition: string;
    heroPosition: string;
  };
  microcopy: {
    enter: string;
    loading: string;
    preferencesEyebrow: string;
    summaryTitle: string;
    summaryBody: string;
    resultsEyebrow: string;
  };
}

// Editorial identities supplied by the user. These never alter MAL data or recommendation weights.
export const PROFILES: readonly ProfileIdentity[] = [
  {
    id: "sadpuyana",
    displayName: "SadPuyana",
    malUsername: "SadPuyana",
    subtitle: "Magia · fantasía · aventura",
    tagline: "Siempre hay otro mundo por descubrir.",
    description:
      "Una puerta a mundos de fantasía, cristales de magia y aventuras llenas de misterio.",
    inspirations: ["Mushoku Tensei", "Roxy Migurdia"],
    palette: {
      primary: "#80dddc",
      secondary: "#b7a4ef",
      surface: "#17272f",
      onAccent: "#102125",
    },
    accentColor: "#80dddc",
    avatarAsset: "art/profiles/sadpuyana.webp",
    heroAsset: "art/profiles/sadpuyana.webp",
    decorativeTokens: {
      motif: "magic",
      symbol: "✧",
      portraitPosition: "50% 34%",
      heroPosition: "50% 38%",
    },
    microcopy: {
      enter: "Abrir mi mundo",
      loading: "Abriendo el mundo de SadPuyana",
      preferencesEyebrow: "TU PRÓXIMA AVENTURA EMPIEZA AQUÍ",
      summaryTitle: "Hay otro mundo al otro lado.",
      summaryBody:
        "Tu historial marca el camino. Tú decides qué historias merece la pena explorar.",
      resultsEyebrow: "UN NUEVO MUNDO EN TU LISTA",
    },
  },
  {
    id: "nora",
    displayName: "Nora",
    malUsername: "Noraaa_12",
    subtitle: "Misterio · botánica · delicadeza",
    tagline: "Las mejores historias esconden algo.",
    description:
      "Un jardín nocturno de tonos vino, hojas de salvia y pequeños enigmas por resolver.",
    inspirations: ["Maomao", "Nezuko"],
    palette: {
      primary: "#f0a8bf",
      secondary: "#a8cbb0",
      surface: "#30212e",
      onAccent: "#29131e",
    },
    accentColor: "#f0a8bf",
    avatarAsset: "art/profiles/nora.webp",
    heroAsset: "art/profiles/nora.webp",
    decorativeTokens: {
      motif: "botanical",
      symbol: "❧",
      portraitPosition: "50% 32%",
      heroPosition: "50% 38%",
    },
    microcopy: {
      enter: "Seguir la curiosidad",
      loading: "Explorando el jardín de Nora",
      preferencesEyebrow: "SIGUE EL HILO DE TU CURIOSIDAD",
      summaryTitle: "Una historia que pide otra mirada.",
      summaryBody:
        "Entre tus valoraciones hay pistas. Las conectamos con nuevas historias para ti.",
      resultsEyebrow: "HISTORIAS QUE GUARDAN UN SECRETO",
    },
  },
  {
    id: "anto",
    displayName: "Anto",
    malUsername: "Antoniioman",
    subtitle: "Romance · calma · sensibilidad",
    tagline: "Historias que se quedan contigo.",
    description:
      "Azules suaves, luz tranquila y una melodía delicada para acompañar el siguiente capítulo.",
    inspirations: ["The Quintessential Quintuplets", "Nakano Miku"],
    palette: {
      primary: "#a7c7fb",
      secondary: "#d1b7ef",
      surface: "#222737",
      onAccent: "#162039",
    },
    accentColor: "#a7c7fb",
    avatarAsset: "art/profiles/anto.webp",
    heroAsset: "art/profiles/anto.webp",
    decorativeTokens: {
      motif: "music",
      symbol: "♫",
      portraitPosition: "50% 32%",
      heroPosition: "50% 37%",
    },
    microcopy: {
      enter: "Encontrar mi historia",
      loading: "Afinando la selección de Anto",
      preferencesEyebrow: "A TU RITMO, CON TUS GUSTOS",
      summaryTitle: "Tu siguiente historia, sin prisa.",
      summaryBody:
        "Un momento para elegir. Dejamos que tus valoraciones guíen la selección.",
      resultsEyebrow: "PARA TU PRÓXIMO MOMENTO FAVORITO",
    },
  },
  {
    id: "anita",
    displayName: "Anita",
    malUsername: "aniitabombii09",
    subtitle: "Aventura · libertad · energía",
    tagline: "El horizonte es solo el principio.",
    description:
      "Un viaje luminoso de viento marino, rojos vivos y reflejos dorados. Siempre hacia delante.",
    inspirations: ["Luffy", "One Piece"],
    palette: {
      primary: "#ffc779",
      secondary: "#f18b78",
      surface: "#30271f",
      onAccent: "#2c1b0d",
    },
    accentColor: "#ffc779",
    avatarAsset: "art/profiles/anita.webp",
    heroAsset: "art/profiles/anita.webp",
    decorativeTokens: {
      motif: "ocean",
      symbol: "☀",
      portraitPosition: "50% 32%",
      heroPosition: "50% 37%",
    },
    microcopy: {
      enter: "Zarpar hacia lo nuevo",
      loading: "Preparando el viaje de Anita",
      preferencesEyebrow: "HAY HISTORIAS MÁS ALLÁ DEL HORIZONTE",
      summaryTitle: "La próxima aventura te espera.",
      summaryBody:
        "Tus gustos a bordo. Una selección de historias reales para seguir explorando.",
      resultsEyebrow: "RUMBO A TU PRÓXIMA AVENTURA",
    },
  },
];

export const CUSTOM_PROFILE: ProfileIdentity = {
  id: "custom",
  displayName: "Otro usuario",
  malUsername: null,
  subtitle: "Tu lista, tu propio universo",
  tagline: "Una historia que solo tú puedes traer.",
  description:
    "Conecta cualquier lista pública de MyAnimeList y descubre recomendaciones a partir de sus datos.",
  inspirations: [],
  palette: {
    primary: "#d0c2dd",
    secondary: "#a7b4cb",
    surface: "#24212c",
    onAccent: "#211a2b",
  },
  accentColor: "#d0c2dd",
  avatarAsset: null,
  heroAsset: "art/nextanime-world.webp",
  decorativeTokens: {
    motif: "neutral",
    symbol: "+",
    portraitPosition: "center",
    heroPosition: "76% 35%",
  },
  microcopy: {
    enter: "Trae tu propia historia",
    loading: "Conectando con tu lista",
    preferencesEyebrow: "EL SIGUIENTE CAPÍTULO LO ELIGES TÚ",
    summaryTitle: "El próximo anime que no podrás soltar.",
    summaryBody:
      "Conectamos tus valoraciones con historias reales. Tú eliges el rumbo.",
    resultsEyebrow: "TU SIGUIENTE GRAN HISTORIA",
  },
};

export function resolveProfile(username?: string | null): ProfileIdentity {
  const known = PROFILES.find(
    (p) => p.malUsername?.toLowerCase() === username?.toLowerCase(),
  );
  return (
    known ??
    (username
      ? { ...CUSTOM_PROFILE, displayName: username, malUsername: username }
      : CUSTOM_PROFILE)
  );
}
