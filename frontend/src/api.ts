const base =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "" : "https://nextanime-server.up.railway.app");
let token = "";
try {
  token = sessionStorage.getItem("nextanime:admin") || "";
} catch {
  /* Optional tab storage. */
}
export function setAdminToken(value: string) {
  token = value;
  try {
    if (value) sessionStorage.setItem("nextanime:admin", value);
    else sessionStorage.removeItem("nextanime:admin");
  } catch {
    /* Memory still works when storage is unavailable. */
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(180000),
    });
  } catch {
    throw new Error(
      "No podemos conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "El backend necesita actualizarse o no está disponible. Inténtalo más tarde.",
    );
  }
  if (response.status === 401 && path !== "/admin/login") {
    setAdminToken("");
    window.dispatchEvent(new Event("nextanime:admin-expired"));
  }
  if (!response.ok)
    throw new Error(data.error || "No hemos podido completar la consulta.");
  return data as T;
}
