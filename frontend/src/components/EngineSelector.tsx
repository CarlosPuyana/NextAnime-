import { SlidersHorizontal, Sparkles, ShieldCheck } from "lucide-react";
import type {
  GeminiAvailability,
  RecommendationMode,
} from "../../../shared/types";
export function EngineSelector({
  mode,
  onModeChange,
  consent,
  onConsentChange,
  gemini,
}: {
  mode: RecommendationMode;
  onModeChange: (mode: RecommendationMode) => void;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  gemini: GeminiAvailability;
}) {
  return (
    <section className="panel engine-panel" aria-labelledby="engine-title">
      <div className="section-title">
        <span className="number">04</span>
        <h2 id="engine-title">¿Cómo elegimos tu próximo anime?</h2>
      </div>
      <p>
        Elige el análisis clásico o, cuando esté disponible, una segunda lectura
        narrativa con Gemini.
      </p>
      <div className="engine-options">
        <button
          className={`source-card ${mode === "classic" ? "selected" : ""}`}
          aria-pressed={mode === "classic"}
          onClick={() => onModeChange("classic")}
        >
          <SlidersHorizontal size={20} />
          <strong>Recomendación clásica</strong>
          <span>
            Tus notas, afinidades y diversidad. Sin enviar tu historial a un
            proveedor de IA.
          </span>
        </button>
        <button
          className={`source-card ${mode === "gemini" ? "selected" : ""}`}
          aria-pressed={mode === "gemini"}
          disabled={!gemini.available}
          onClick={() => onModeChange("gemini")}
        >
          <Sparkles size={20} />
          <strong>Gemini experimental</strong>
          <span>
            Compara un resumen de tus gustos y reordena candidatos ya
            verificados.
          </span>
          <small>
            {gemini.available
              ? "Análisis externo opcional"
              : "Preparado · no disponible"}
          </small>
        </button>
      </div>
      {!gemini.available && (
        <p className="engine-availability">
          {gemini.message}{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noreferrer"
          >
            Condiciones de Google
          </a>
        </p>
      )}
      {mode === "gemini" && gemini.available && (
        <div className="ai-consent">
          <ShieldCheck size={18} />
          <div>
            <p>
              Google recibirá hasta 40 candidatos, sinopsis y una selección
              limitada de tus valoraciones para ordenar las propuestas. No
              enviamos tu username ni el historial completo. El tratamiento
              depende de las condiciones de Google; si no quieres compartir
              estos datos, utiliza el modo clásico.
            </p>
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => onConsentChange(e.target.checked)}
              />{" "}
              Soy mayor de 18 años y acepto este análisis externo de los datos
              de esta lista.
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
