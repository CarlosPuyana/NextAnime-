// Local-only password setup. Never served by the application or included in its bundle.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { hashPassword } from "../backend/src/admin.js";
const exec = promisify(execFile);
const nonce = randomBytes(24).toString("hex");
const path = `/setup/${nonce}`;
let origin = "",
  busy = false,
  done = false;
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
  );
  if (req.url !== path || req.headers.host !== new URL(origin).host || done) {
    res.writeHead(404).end();
    return;
  }
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NextAnime · contraseña privada</title>
<style nonce="${nonce}">body{max-width:460px;margin:8vh auto;padding:24px;background:#101014;color:#eee;font:16px system-ui}input,button{box-sizing:border-box;width:100%;padding:12px;margin:10px 0 20px;background:#24212a;color:#fff;border:1px solid #88728d;border-radius:8px}button{background:#b95279}p{line-height:1.6}small{color:#bbb}</style>
<h1>NextAnime · acceso privado</h1><p>Elige la contraseña del administrador <strong>SadPuyana</strong>. Se calculará su hash en este ordenador y se guardará únicamente ese hash en Railway.</p><form><label>Contraseña nueva (mínimo 12 caracteres)<input id="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></label><label>Repetir contraseña<input id="confirmation" type="password" autocomplete="new-password" required></label><button>Guardar contraseña en Railway</button></form><p id="message" role="status"></p><small>No se guarda la contraseña en archivos ni registros. Gemini permanece desactivado.</small>
<script nonce="${nonce}">document.querySelector('form').onsubmit=async(e)=>{e.preventDefault();const p=document.querySelector('#password'),c=document.querySelector('#confirmation'),b=document.querySelector('button'),m=document.querySelector('#message');if(p.value!==c.value){m.textContent='Las contraseñas no coinciden.';return;}b.disabled=true;m.textContent='Guardando el hash privado…';try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Nonce':'${nonce}'},body:JSON.stringify({password:p.value})});p.value='';c.value='';const d=await r.json();m.textContent=d.message;if(r.ok){document.querySelector('form').remove();}else{b.disabled=false;}}catch{p.value='';c.value='';m.textContent='No se pudo completar. Vuelve a abrir la herramienta local.';b.disabled=false;}};</script></html>`);
    return;
  }
  if (
    req.method !== "POST" ||
    req.headers.origin !== origin ||
    req.headers["x-setup-nonce"] !== nonce ||
    req.headers["content-type"] !== "application/json"
  ) {
    res.writeHead(403).end();
    return;
  }
  if (busy) {
    res.writeHead(409).end();
    return;
  }
  busy = true;
  try {
    let body = "";
    for await (const part of req) {
      body += part;
      if (body.length > 2048) throw new Error("size");
    }
    const input = JSON.parse(body);
    body = "";
    if (
      typeof input.password !== "string" ||
      input.password.length < 12 ||
      input.password.length > 128
    )
      throw new Error("password");
    const hash = await hashPassword(input.password);
    input.password = "";
    const cli =
      process.env.RAILWAY_CLI ||
      resolve(".local/legacy-node_modules/@railway/cli/bin/railway.exe");
    await exec(cli, ["variable", "set", `ADMIN_PASSWORD_HASH=${hash}`], {
      timeout: 60_000,
      windowsHide: true,
    });
    done = true;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message:
          "Contraseña configurada. Railway está aplicando el cambio. En NextAnime pulsa Iniciar sesión y utiliza SadPuyana y la contraseña que acabas de elegir. Puedes cerrar esta ventana.",
      }),
    );
    console.log("ADMIN_PASSWORD_HASH configurado. No se guardó la contraseña.");
    server.close();
  } catch {
    res
      .writeHead(400, { "Content-Type": "application/json" })
      .end(
        JSON.stringify({
          message:
            "No se pudo guardar. Comprueba que la contraseña tiene entre 12 y 128 caracteres e inténtalo de nuevo.",
        }),
      );
  } finally {
    busy = false;
  }
});
server.requestTimeout = 65_000;
server.listen(0, "127.0.0.1", () => {
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  console.log(`Configuración privada local: ${origin}${path}`);
});
setTimeout(() => server.close(), 60 * 60_000).unref();
