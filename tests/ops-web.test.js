import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("API publica apenas o console legado em /app/", async () => {
  const server = await source("../apps/api/src/server.js");
  assert.match(server, /const OPS_WEB_DIR = fileURLToPath\(new URL\("\.\.\/\.\.\/ops-web-legacy\/", import\.meta\.url\)\)/);
  assert.match(server, /const PUBLIC_UI_PATHS = new Set\(\["\/", "\/app", "\/app\/", "\/app\/main\.js", "\/app\/styles\.css", "\/app\/legacy", "\/app\/legacy\/"\]\)/);
  assert.match(server, /app\.get\("\/app\/", async \(_request, reply\) => \{/);
  assert.match(server, /readFile\(`\$\{OPS_WEB_DIR\}\/index\.html`\)/);
  assert.match(server, /app\.get\("\/app\/main\.js"/);
  assert.match(server, /app\.get\("\/app\/styles\.css"/);
  assert.match(server, /app\.get\("\/app\/legacy", async \(_request, reply\) => reply\.redirect\("\/app\/"\)\)/);
  assert.match(server, /app\.get\("\/app\/legacy\/", async \(_request, reply\) => reply\.redirect\("\/app\/"\)\)/);
  assert.doesNotMatch(server, /fastifyStatic|ops-web\/dist|reply\.sendFile|app\.post\("\/demo\/access"/);
});

test("Docker, scripts, pacote API e Render nao dependem mais do static site React", async () => {
  const [dockerfile, apiPackageJson, packageJson, renderYaml] = await Promise.all([
    source("../apps/api/Dockerfile"),
    source("../apps/api/package.json"),
    source("../package.json"),
    source("../render.yaml")
  ]);

  assert.doesNotMatch(dockerfile, /ops_web_builder|ops-web\/dist|COPY apps\/ops-web\/package\.json|COPY apps\/ops-web \.\//);
  assert.doesNotMatch(apiPackageJson, /@fastify\/static/);
  assert.doesNotMatch(packageJson, /check:frontend|build:frontend|npm --prefix apps\/ops-web/);
  assert.match(packageJson, /"build": "npm run check"/);
  assert.doesNotMatch(renderYaml, /camoburguer-ops-web|VITE_PUBLIC_BASE|VITE_API_BASE|VITE_DEMO_MODE|AUTH_COOKIE_SAMESITE|DEMO_DIRECT_ACCESS/);
  assert.match(renderYaml, /buildCommand: npm ci/);
  await assert.rejects(source("../apps/ops-web/package.json"));
  await assert.rejects(source("../apps/ops-web-legacy/Dockerfile"));
});

test("Smoke e E2E apontam para /app legado como superficie unica", async () => {
  const [smoke, e2e] = await Promise.all([
    source("./smoke.mjs"),
    source("./e2e/ops-shell.spec.js")
  ]);

  assert.match(smoke, /const webBase = process\.env\.WEB_BASE_URL \|\| `\$\{apiBase\}\/app\/`/);
  assert.match(smoke, /assert\.match\(webHtml, \/Pedidos, cozinha e financeiro\//);
  assert.match(smoke, /assert\.doesNotMatch\(webHtml,/);
  assert.match(smoke, /id="root"/);
  assert.match(smoke, /fetch\(`\$\{apiBase\}\/app\/legacy\/`, \{ redirect: "manual" \}\)/);
  assert.doesNotMatch(e2e, /Entrar como admin demo|Centro operacional com sess/);
  assert.match(e2e, /page\.goto\("\/app\/"\)/);
  assert.match(e2e, /Gest\.\*Operacional/);
  assert.doesNotMatch(e2e, /page\.goto\("\/app\/legacy\/"\)/);
});
