import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("shell React restaura sessao via /auth/me e nao usa /health como identidade", async () => {
  const app = await source("../apps/ops-web/src/App.tsx");
  assert.match(app, /api<SessionPayload>\("\/auth\/me"\)/);
  assert.doesNotMatch(app, /api\("\/health"\)/);
  assert.match(app, /Console operacional completo/);
});

test("cliente HTTP usa credenciais include e CSRF somente em memoria", async () => {
  const apiClient = await source("../apps/ops-web/src/lib/api.ts");
  assert.match(apiClient, /import\.meta\.env\.VITE_API_BASE/);
  assert.match(apiClient, /let csrfToken = ""/);
  assert.match(apiClient, /credentials: "include"/);
  assert.match(apiClient, /headers\.set\("x-csrf-token", csrfToken\)/);
  assert.doesNotMatch(apiClient, /meta\[name="csrf-token"\]|document\.querySelector|localStorage|sessionStorage/);
});

test("API publica /auth/me e o console legado em /app/legacy/", async () => {
  const server = await source("../apps/api/src/server.js");
  assert.match(server, /OPS_WEB_LEGACY_DIR/);
  assert.match(server, /app\.get\("\/auth\/me"/);
  assert.match(server, /app\.get\("\/app\/legacy"/);
  assert.match(server, /prefix: "\/app\/legacy\/"/);
});

test("RBAC classifica a rota de sessao e leitura de auditoria", async () => {
  const auth = await source("../apps/api/src/auth.js");
  assert.match(auth, /operator: \["session"/);
  assert.match(auth, /kitchen: \["session"/);
  assert.match(auth, /if \(path === "\/auth\/me" && method === "GET"\) return "session"/);
  assert.match(auth, /if \(path === "\/audit"\) return "admin"/);
});

test("frontend novo nao expõe placeholder de construçao e embute o iframe operacional", async () => {
  const [app, styles] = await Promise.all([
    source("../apps/ops-web/src/App.tsx"),
    source("../apps/ops-web/src/App.css")
  ]);
  assert.doesNotMatch(app, /Sistema em constru/);
  assert.match(app, /src="\/app\/legacy\/"/);
  assert.match(app, /Visão geral|Visao geral/);
  assert.match(styles, /\.embedded-console/);
});
