import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Film,
  Heart,
  Layers,
  ListVideo,
  Plus,
  Search,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type {
  Analysis,
  Genre,
  Preferences,
  Profile,
  Recommendation,
  Results,
  RecommendationMode,
  GeminiAvailability,
} from "../../shared/types";
import { api } from "./api";
import { genreName } from "../../shared/genre-labels";
import { CUSTOM_PROFILE, PROFILES, resolveProfile } from "./config/profiles";
import { ProfileAvatar, profileAssetUrl } from "./components/ProfileAvatar";
import { ProfileCard } from "./components/ProfileCard";
import { EngineSelector } from "./components/EngineSelector";
import { AdminAccess } from "./components/AdminAccess";

const defaults: Preferences = { genres: [], source: "both", count: 5 };
function App() {
  const [screen, setScreen] = useState<"profiles" | "preferences" | "results">(
    "profiles",
  );
  const [profile, setProfile] = useState<
    (Profile & { analysis: Analysis }) | null
  >(null);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [genres, setGenres] = useState<Genre[]>([]),
    [genreError, setGenreError] = useState("");
  const [search, setSearch] = useState(""),
    [custom, setCustom] = useState(false),
    [username, setUsername] = useState("");
  const [loading, setLoading] = useState(""),
    [error, setError] = useState("");
  const [result, setResult] = useState<Results | null>(null),
    [seen, setSeen] = useState<number[]>([]);
  const [last, setLast] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<RecommendationMode>("classic");
  const [aiConsent, setAiConsent] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [customSelection, setCustomSelection] = useState(false);
  useEffect(() => {
    if (!admin) {
      setMode("classic");
      setAiConsent(false);
    }
  }, [admin]);
  const [gemini, setGemini] = useState<GeminiAvailability>({
    available: false,
    reason: "loading",
    model: "",
    message:
      "El modo clásico está disponible. No se ha confirmado la disponibilidad de Groq.",
  });
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    void api<{ ai?: GeminiAvailability; gemini: GeminiAvailability }>(
      "/capabilities",
    )
      .then((data) => setGemini(data.ai ?? data.gemini))
      .catch(() =>
        setGemini({
          available: false,
          reason: "unavailable",
          model: "",
          message:
            "No se pudo confirmar la disponibilidad de Groq. Puedes continuar con el modo clásico.",
        }),
      );
    try {
      setLast(localStorage.getItem("nextanime:last") ?? "");
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  useEffect(() => {
    titleRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);
  async function fetchGenres() {
    setGenreError("");
    try {
      setGenres(await api<Genre[]>("/genres"));
    } catch (e) {
      setGenreError((e as Error).message);
    }
  }
  async function selectProfile(name: string, fromCustom = false) {
    if (!/^[A-Za-z0-9_-]{2,16}$/.test(name)) {
      setError("Usa entre 2 y 16 letras, números, guiones o guiones bajos.");
      return;
    }
    setError("");
    const identity = resolveProfile(name);
    setSelectedId(identity.id);
    setLoading(
      identity.id === "custom"
        ? `Conectando con ${name}`
        : identity.microcopy.loading,
    );
    void fetchGenres();
    try {
      const data = await api<Profile & { analysis: Analysis }>(
        `/profiles/${encodeURIComponent(name)}`,
      );
      setProfile(data);
      setCustomSelection(fromCustom);
      setSeen([]);
      setResult(null);
      setPreferences(defaults);
      setMode("classic");
      setAiConsent(false);
      setScreen("preferences");
      setLast(name);
      try {
        localStorage.setItem("nextanime:last", name);
      } catch {
        /* Optional storage. */
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }
  async function discover() {
    if (!profile) return;
    if (mode !== "classic" && !aiConsent) {
      setError(
        "Confirma el consentimiento o utiliza la recomendación clásica.",
      );
      return;
    }
    setError("");
    setLoading("Encontrando tu próxima historia");
    try {
      const data = await api<Results>("/recommendations", {
        username: profile.username,
        preferences,
        seen,
        mode,
        ...(mode !== "classic" && aiConsent
          ? {
              consent: {
                externalProcessing: true,
                adult: true,
                version: "2026-11-01",
              },
            }
          : {}),
      });
      setResult(data);
      setSeen((old) => [
        ...new Set([...old, ...data.items.map((i) => i.anime.id)]),
      ]);
      setScreen("results");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }
  function changeProfile() {
    setScreen("profiles");
    setProfile(null);
    setError("");
    setResult(null);
    setSeen([]);
    setSelectedId(null);
    setMode("classic");
    setAiConsent(false);
  }
  function updatePreferences(next: Preferences) {
    setPreferences(next);
  }
  const identity = resolveProfile(profile?.username);
  const themeStyle = profile
    ? ({
        "--pink": identity.accentColor,
        "--profile-accent": identity.accentColor,
        "--profile-secondary": identity.palette.secondary,
        "--profile-surface": identity.palette.surface,
        "--profile-on-accent": identity.palette.onAccent,
        "--profile-hero": `url("${profileAssetUrl(identity.heroAsset)}")`,
        "--profile-hero-position": identity.decorativeTokens.heroPosition,
      } as CSSProperties)
    : undefined;
  const selectedGenres = genres.filter((g) =>
    preferences.genres.includes(g.id),
  );
  return (
    <div
      className={`app screen-${screen}`}
      style={themeStyle}
      data-profile-id={profile ? identity.id : undefined}
      data-profile-motif={profile ? identity.decorativeTokens.motif : undefined}
    >
      <header className="header">
        <button
          className="brand"
          onClick={changeProfile}
          aria-label="NextAnime, cambiar perfil"
        >
          <span className="brand-mark">
            N<span>✦</span>
          </span>
          Next<span>Anime</span>
          <span className="brand-dot" />
        </button>
        <span className="header-caption">MENOS BUSCAR. MÁS SENTIR.</span>
        <AdminAccess onChange={setAdmin} />
        {profile ? (
          <button className="profile-switch" onClick={changeProfile}>
            <ProfileAvatar identity={identity} small />
            <span className="active-profile-name">
              {identity.displayName}
              <small>@{profile.username}</small>
            </span>
            <ChevronRight size={15} />
          </button>
        ) : (
          <a
            className="mal-link"
            href="https://myanimelist.net"
            target="_blank"
            rel="noreferrer"
          >
            Tus listas de MyAnimeList <ExternalLink size={13} />
          </a>
        )}
      </header>
      <main>
        {screen === "profiles" && (
          <section className="profile-page">
            <div className="scene" aria-hidden="true">
              <div className="scene-grid" />
              <span className="scene-moon" />
              <span className="scene-star star-a">✦</span>
              <span className="scene-star star-b">✧</span>
              <svg
                className="scene-mountains"
                viewBox="0 0 1400 300"
                preserveAspectRatio="none"
              >
                <path d="M0 300V210l130-70 140 100 180-130 150 100 170-150 180 140 120-70 230 130v40z" />
                <path d="M0 300V270l150-70 170 80 190-90 140 70 170-110 220 120 160-90 200 100v20z" />
              </svg>
            </div>
            <div className="profile-intro">
              <div className="eyebrow">
                <span /> TU PRÓXIMA OBSESIÓN TE ESPERA
              </div>
              <h1 ref={titleRef} tabIndex={-1}>
                Cada gusto, un universo.
                <br />
                <span>¿Cuál es el tuyo?</span>
              </h1>
              <p className="intro">
                Tus historias favoritas dicen mucho de ti.
                <br className="mobile-break" /> Descubre el anime que viene
                después.
              </p>
            </div>
            <div className="profile-grid">
              {PROFILES.map((p) => (
                <ProfileCard
                  key={p.id}
                  identity={p}
                  selected={selectedId === p.id}
                  last={last.toLowerCase() === p.malUsername?.toLowerCase()}
                  disabled={!!loading}
                  onSelect={() => void selectProfile(p.malUsername!)}
                />
              ))}
              <button
                className={`profile-card custom-profile ${custom ? "chosen" : ""}`}
                onClick={() => {
                  setCustom(!custom);
                  setError("");
                }}
                disabled={!!loading}
                aria-expanded={custom}
              >
                <span className="avatar-frame custom-avatar">
                  <Plus size={38} strokeWidth={1.3} />
                </span>
                <span className="profile-name">
                  {CUSTOM_PROFILE.displayName}
                </span>
                <span className="profile-tagline">
                  {CUSTOM_PROFILE.subtitle}
                </span>
                <span className="profile-hint">
                  {CUSTOM_PROFILE.microcopy.enter}
                </span>
              </button>
            </div>
            {custom && (
              <form
                className="custom-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void selectProfile(username.trim(), true);
                }}
              >
                <label htmlFor="username">Tu nombre de MyAnimeList</label>
                <div className="input-row">
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nombre de usuario"
                    maxLength={16}
                    autoFocus
                    autoComplete="username"
                    required
                  />
                  <button className="primary" disabled={!!loading}>
                    Continuar <ArrowRight size={17} />
                  </button>
                </div>
                <small>
                  Solo necesitas una lista pública. Sin contraseñas.
                </small>
              </form>
            )}
            <div className="profile-bottom">
              <span>
                <ShieldCheck size={16} /> Tu lista es tuya. Solo la consultamos.
              </span>
              <span>
                <Sparkles size={16} /> Recomendaciones con criterio, hechas para
                ti.
              </span>
            </div>
          </section>
        )}
        {screen !== "profiles" && (
          <div className="workspace">
            <nav className="steps" aria-label="Pasos">
              <span className="done">
                <Check size={14} /> Tu perfil
              </span>
              <i />
              <span className={screen === "preferences" ? "current" : "done"}>
                02 <span>Tus preferencias</span>
              </span>
              <i />
              <span className={screen === "results" ? "current" : ""}>
                03 <span>Tu próximo anime</span>
              </span>
            </nav>
            {screen === "preferences" && profile && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {identity.microcopy.preferencesEyebrow}
                    </div>
                    <h1 ref={titleRef} tabIndex={-1}>
                      Afinemos tu <em>próxima historia.</em>
                    </h1>
                    <p>
                      Un poco de tus gustos. Un poco de descubrimiento. Mucho
                      anime.
                    </p>
                  </div>
                  <span className="list-badge">
                    <ListVideo size={19} />
                    {profile.anime.length} títulos en tu lista
                  </span>
                </div>
                <div className="preferences-layout">
                  <div className="preference-sections">
                    <section className="panel taste-panel">
                      <div className="section-title">
                        <span className="section-icon">
                          <Heart size={18} />
                        </span>
                        <h2>Lo que cuenta tu lista</h2>
                        <span className="subtle">
                          {profile.analysis.rated} valoraciones
                        </span>
                      </div>
                      {profile.analysis.confidence === "low" ? (
                        <p>
                          Aún hay pocas valoraciones para sacar conclusiones
                          fiables. Tus filtros nos ayudarán a empezar.
                        </p>
                      ) : (
                        <>
                          <p>
                            Estas afinidades combinan tus notas con la cantidad
                            de títulos valorados.
                          </p>
                          <div className="taste-list">
                            {profile.analysis.favorites
                              .filter((t) => t.affinity > 0)
                              .slice(0, 4)
                              .map((t) => (
                                <div key={t.genre.id}>
                                  <span>{genreName(t.genre.name)}</span>
                                  <strong>
                                    {t.mean.toFixed(1)}
                                    <small>/10</small>
                                  </strong>
                                  <div className="taste-bar">
                                    <i style={{ width: `${t.mean * 10}%` }} />
                                  </div>
                                  <small>{t.samples} títulos valorados</small>
                                </div>
                              ))}
                          </div>
                          {!profile.analysis.favorites.some(
                            (t) => t.affinity > 0,
                          ) && (
                            <p>
                              Tu historial no muestra una afinidad clara por un
                              género concreto.
                            </p>
                          )}
                        </>
                      )}
                    </section>
                    <section className="panel">
                      <div className="section-title">
                        <span className="number">01</span>
                        <h2>¿Qué te apetece?</h2>
                        <span className="subtle">
                          {preferences.genres.length
                            ? `${preferences.genres.length} seleccionados`
                            : "Todos los géneros"}
                        </span>
                      </div>
                      <p>
                        Elige uno, mezcla varios o déjate sorprender. Sin
                        selección, todo es posible.
                      </p>
                      <div className="genre-toolbar">
                        <label className="search-field">
                          <Search size={16} />
                          <input
                            aria-label="Buscar géneros"
                            placeholder="Buscar un género o temática…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                        <button
                          className="text-button"
                          onClick={() =>
                            updatePreferences({ ...preferences, genres: [] })
                          }
                        >
                          Limpiar <X size={13} />
                        </button>
                      </div>
                      {genreError ? (
                        <div className="inline-error" role="alert">
                          {genreError}
                          <button
                            className="text-button"
                            onClick={() => void fetchGenres()}
                          >
                            Reintentar cargar géneros
                          </button>
                        </div>
                      ) : !genres.length ? (
                        <p role="status">Cargando catálogo de géneros…</p>
                      ) : (
                        <div className="genre-chips">
                          {genres
                            .filter((g) =>
                              genreName(g.name)
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                            )
                            .map((g) => (
                              <button
                                key={g.id}
                                className={`chip ${preferences.genres.includes(g.id) ? "selected" : ""}`}
                                aria-pressed={preferences.genres.includes(g.id)}
                                onClick={() =>
                                  updatePreferences({
                                    ...preferences,
                                    genres: preferences.genres.includes(g.id)
                                      ? preferences.genres.filter(
                                          (id) => id !== g.id,
                                        )
                                      : [...preferences.genres, g.id],
                                  })
                                }
                              >
                                {preferences.genres.includes(g.id) && (
                                  <Check size={12} />
                                )}{" "}
                                {genreName(g.name)}
                              </button>
                            ))}
                        </div>
                      )}
                      {genres.length > 0 &&
                        !genres.some((g) =>
                          genreName(g.name)
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        ) && <p>No hay géneros con ese nombre.</p>}
                    </section>
                    <section className="panel">
                      <div className="section-title">
                        <span className="number">02</span>
                        <h2>¿Dónde buscamos?</h2>
                      </div>
                      <div className="source-options">
                        {(
                          [
                            {
                              id: "pending",
                              icon: ListVideo,
                              title: "Mis pendientes",
                              text: "Ese anime que guardaste para algún día.",
                            },
                            {
                              id: "discover",
                              icon: Search,
                              title: "Descubrir nuevos",
                              text: "Historias que aún no están en tu radar.",
                            },
                            {
                              id: "both",
                              icon: Layers,
                              title: "Lo mejor de ambos",
                              text: "Tus pendientes y nuevos descubrimientos.",
                            },
                          ] as const
                        ).map((s) => (
                          <button
                            key={s.id}
                            className={`source-card ${preferences.source === s.id ? "selected" : ""}`}
                            aria-pressed={preferences.source === s.id}
                            onClick={() =>
                              updatePreferences({
                                ...preferences,
                                source: s.id,
                              })
                            }
                          >
                            <s.icon size={22} />
                            <strong>{s.title}</strong>
                            <span>{s.text}</span>
                            <i>
                              {preferences.source === s.id && (
                                <Check size={12} />
                              )}
                            </i>
                          </button>
                        ))}
                      </div>
                    </section>
                    <section className="panel quantity">
                      <div>
                        <div className="section-title">
                          <span className="number">03</span>
                          <h2>¿Cuántas historias?</h2>
                        </div>
                        <p>Una pequeña selección o una noche de exploración.</p>
                      </div>
                      <div
                        className="quantity-buttons"
                        aria-label="Cantidad de recomendaciones"
                      >
                        {([3, 5, 10, 20] as const).map((count) => (
                          <button
                            key={count}
                            disabled={mode === "groq" && count !== 3}
                            aria-pressed={preferences.count === count}
                            className={
                              preferences.count === count ? "selected" : ""
                            }
                            onClick={() =>
                              updatePreferences({ ...preferences, count })
                            }
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </section>
                    {admin && !customSelection && identity.id !== "custom" && (
                      <EngineSelector
                        mode={mode}
                        consent={aiConsent}
                        gemini={gemini}
                        onConsentChange={setAiConsent}
                        onModeChange={(next) => {
                          setMode(next);
                          if (next === "groq")
                            setPreferences((old) => ({ ...old, count: 3 }));
                          setAiConsent(false);
                        }}
                      />
                    )}
                  </div>
                  <aside className="discovery-summary">
                    <span className="summary-art" aria-hidden="true">
                      <span className="summary-identity">
                        {identity.decorativeTokens.symbol} {identity.subtitle}
                      </span>
                    </span>
                    <div className="eyebrow">
                      EL UNIVERSO DE {identity.displayName.toUpperCase()}
                    </div>
                    <h2>{identity.microcopy.summaryTitle}</h2>
                    <p>{identity.microcopy.summaryBody}</p>
                    <dl>
                      <div>
                        <dt>Tu perfil</dt>
                        <dd>
                          {identity.displayName}
                          <small className="summary-handle">
                            @{profile.username}
                          </small>
                        </dd>
                      </div>
                      <div>
                        <dt>Selección</dt>
                        <dd>{preferences.count} recomendaciones</dd>
                      </div>
                      <div>
                        <dt>Géneros</dt>
                        <dd>
                          {selectedGenres.length
                            ? selectedGenres
                                .map((g) => genreName(g.name))
                                .join(", ")
                            : "Todos · mente abierta"}
                        </dd>
                      </div>
                    </dl>
                    <button
                      className="primary discover-button"
                      onClick={() => void discover()}
                      disabled={!!loading || (mode !== "classic" && !aiConsent)}
                    >
                      Descubrir mis próximos animes <ArrowRight size={18} />
                    </button>
                    <span className="summary-note">
                      <ShieldCheck size={13} /> No modificamos tu lista de MAL
                    </span>
                  </aside>
                </div>
              </>
            )}
            {screen === "results" && result && (
              <>
                <div className="page-heading results-heading">
                  <div>
                    <div className="eyebrow">
                      <Sparkles size={14} /> {identity.microcopy.resultsEyebrow}
                    </div>
                    <h1 ref={titleRef} tabIndex={-1}>
                      Hay un anime <em>esperándote.</em>
                    </h1>
                    <p>
                      {result.items.length} propuestas para{" "}
                      {identity.displayName}. Elegidas con tus gustos en mente.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setScreen("preferences");
                      setError("");
                    }}
                  >
                    <ArrowLeft size={16} /> Cambiar preferencias
                  </button>
                </div>
                <p
                  className="engine-badge"
                  data-engine={result.engine ?? "classic"}
                >
                  <Sparkles size={14} />
                  {result.engine === "groq"
                    ? "Recomendado con IA · Groq"
                    : result.engine === "gemini"
                      ? "Recomendación con Gemini"
                      : "Recomendación clásica"}
                  {result.engineInfo?.cacheHit && (
                    <small>Resultado reutilizado</small>
                  )}
                </p>
                {result.warnings.map((w) => (
                  <div className="notice" role="status" key={w}>
                    {w}
                  </div>
                ))}
                {result.items[0] ? (
                  <>
                    <AnimeCard item={result.items[0]} featured />
                    <div className="results-section-title">
                      <h2>Más historias para ti</h2>
                      <span>
                        {preferences.source === "pending"
                          ? "DE TUS PENDIENTES"
                          : preferences.source === "discover"
                            ? "NUEVOS HORIZONTES"
                            : "TU SELECCIÓN PERSONAL"}
                      </span>
                    </div>
                    <div className="results-grid">
                      {result.items.slice(1).map((item) => (
                        <AnimeCard key={item.anime.id} item={item} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <Film size={44} />
                    <h2>
                      Hemos explorado todas las alternativas de esta ronda.
                    </h2>
                    <p>
                      Cambia los géneros o el origen para abrir nuevas
                      posibilidades. Tus exclusiones se mantienen.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setScreen("preferences")}
                    >
                      Cambiar preferencias
                    </button>
                  </div>
                )}
                <div className="results-actions">
                  <button
                    className="primary"
                    onClick={() => void discover()}
                    disabled={!!loading}
                  >
                    <Shuffle size={17} /> Recomendar otros
                  </button>
                  <button className="text-button" onClick={changeProfile}>
                    Cambiar perfil <ArrowRight size={15} />
                  </button>
                  <small>
                    {result.engine === "groq"
                      ? "Groq ha seleccionado y ordenado estas propuestas."
                      : result.engine === "gemini"
                        ? "Gemini ha ordenado la selección. Motivos vinculados a sinopsis verificadas."
                        : "Selección y explicaciones del algoritmo clásico. Sin análisis externo de IA."}
                  </small>
                </div>
              </>
            )}
          </div>
        )}
        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
            <button aria-label="Cerrar error" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
      </main>
      <footer>
        <span>
          NextAnime <i>✦</i> Tu próxima historia empieza aquí.
        </span>
        <span>
          Datos de{" "}
          <a href="https://myanimelist.net" target="_blank" rel="noreferrer">
            MyAnimeList
          </a>
          <span className="footer-dot">·</span> Hecho para amantes del anime
        </span>
      </footer>
      {loading && (
        <div
          className="loading-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="loading-card">
            <span className="loading-spark">
              <Sparkles size={38} />
            </span>
            <h2>{loading}</h2>
            <p>
              Consultamos tu lista y verificamos los datos.
              <br />
              Las listas grandes pueden tardar un poco más.
            </p>
            <div className="skeleton-row">
              {[1, 2, 3].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function AnimeCard({
  item,
  featured = false,
}: {
  item: Recommendation;
  featured?: boolean;
}) {
  const a = item.anime;
  return (
    <article className={featured ? "anime-featured" : "anime-card"}>
      <div className="poster-wrap">
        {a.picture ? (
          <img
            src={a.picture}
            alt={`Portada de ${a.title}`}
            loading={featured ? "eager" : "lazy"}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Film size={40} />
        )}
        <span className={`origin ${item.origin}`}>
          {item.origin === "pending" ? (
            <ListVideo size={12} />
          ) : (
            <Sparkles size={12} />
          )}{" "}
          {item.origin === "pending"
            ? "De tus pendientes"
            : "Nuevo descubrimiento"}
        </span>
      </div>
      <div className="anime-content">
        {featured && (
          <div className="eyebrow">
            <Star size={13} /> NUESTRA PRIMERA ELECCIÓN
          </div>
        )}
        <div className="anime-meta">
          <span>{a.year ?? "Año no disponible"}</span>
          <span>{a.format?.toUpperCase() ?? "Formato N/D"}</span>
          <span>
            {a.episodes ? `${a.episodes} episodios` : "Episodios N/D"}
          </span>
          {a.mean !== null && (
            <strong>
              <Star size={13} fill="currentColor" /> {a.mean.toFixed(2)}{" "}
              <small>MAL</small>
            </strong>
          )}
        </div>
        <h2>{a.title}</h2>
        <div className="card-genres">
          {a.genres.slice(0, 4).map((g) => (
            <span key={g.id}>{genreName(g.name)}</span>
          ))}
        </div>
        <p className="synopsis" lang="en">
          {a.synopsis ?? "La fuente no ofrece una sinopsis para este título."}
        </p>
        <div className="explanation">
          <Sparkles size={17} />
          <div>
            <strong>Por qué puede gustarte</strong>
            <p>{item.explanation}</p>
          </div>
        </div>
        <a
          className={featured ? "primary mal-button" : "card-link"}
          href={`https://myanimelist.net/anime/${a.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver en MyAnimeList <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}
export default App;
