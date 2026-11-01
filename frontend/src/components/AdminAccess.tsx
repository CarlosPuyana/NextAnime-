import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api, setAdminToken } from "../api";
interface Session {
  authenticated: boolean;
  configured: boolean;
  expiresAt: number | null;
}
export function AdminAccess({
  onChange,
}: {
  onChange: (authenticated: boolean) => void;
}) {
  const [session, setSession] = useState<Session>({
    authenticated: false,
    configured: true,
    expiresAt: null,
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let live = true;
    void api<Session>("/admin/session")
      .then((data) => {
        if (!live) return;
        setSession(data);
        onChange(data.authenticated);
        if (!data.authenticated) setAdminToken("");
      })
      .catch(() => {
        if (live) {
          setAdminToken("");
          onChange(false);
        }
      });
    const expired = () => {
      setSession((old) => ({ ...old, authenticated: false, expiresAt: null }));
      onChange(false);
      setError("La sesión ha caducado. Vuelve a iniciar sesión.");
    };
    window.addEventListener("nextanime:admin-expired", expired);
    return () => {
      live = false;
      window.removeEventListener("nextanime:admin-expired", expired);
    };
  }, [onChange]);
  useEffect(() => {
    if (!session.expiresAt) return;
    const timeout = window.setTimeout(
      () => {
        setAdminToken("");
        window.dispatchEvent(new Event("nextanime:admin-expired"));
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [session.expiresAt]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api<{ token: string; expiresAt: number }>(
        "/admin/login",
        { username, password },
      );
      setAdminToken(result.token);
      setSession({
        authenticated: true,
        configured: true,
        expiresAt: result.expiresAt,
      });
      onChange(true);
      dialog.current?.close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/admin/logout", {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdminToken("");
      setSession((old) => ({ ...old, authenticated: false, expiresAt: null }));
      onChange(false);
      setBusy(false);
    }
  }
  return (
    <div className="admin-access">
      <button
        className="admin-trigger"
        onClick={() => {
          setError("");
          setPassword("");
          dialog.current?.showModal();
        }}
      >
        {session.authenticated ? "Administrador" : "Iniciar sesión"}
      </button>
      <dialog
        ref={dialog}
        className="admin-dialog"
        aria-labelledby="admin-title"
        onClose={() => setPassword("")}
      >
        <button
          className="admin-close"
          aria-label="Cerrar acceso de administrador"
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
        <h2 id="admin-title">Acceso de administrador</h2>
        {session.authenticated ? (
          <>
          <p>
            Sesión privada activa. La IA experimental solo admite los cuatro
              perfiles predefinidos y depende de la disponibilidad del backend.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void logout()}
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void login(e)}>
            <p>Acceso privado para las pruebas del desarrollador.</p>
            {!session.configured && (
              <p className="admin-notice">
                Falta configurar la contraseña del administrador en Railway.
              </p>
            )}
            <label htmlFor="admin-username">Usuario</label>
            <input
              id="admin-username"
              autoComplete="username"
              maxLength={64}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="admin-password">Contraseña</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              maxLength={256}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="primary" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </dialog>
    </div>
  );
}
