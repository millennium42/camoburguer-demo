import test from "node:test";
import assert from "node:assert/strict";

const PUBLIC_UI_PATHS = new Set(["/", "/app", "/app/", "/app/main.js", "/app/styles.css"]);
const config = { corsOrigins: ["http://localhost"] };

function isPublicRequest(request) {
  const path = request.url.split("?")[0];
  const preflight = request.method === "OPTIONS"
    && config.corsOrigins.includes(String(request.headers?.origin || ""))
    && Boolean(request.headers?.["access-control-request-method"]);
  const publicUi = (request.method === "GET" || request.method === "HEAD") && PUBLIC_UI_PATHS.has(path);
  return preflight || publicUi || path === "/health" || (request.method === "POST" && path === "/auth/login");
}

test("M-02: isPublicRequest permite GET / e HEAD / mas recusa POST /", () => {
  assert.equal(isPublicRequest({ method: "GET", url: "/" }), true);
  assert.equal(isPublicRequest({ method: "HEAD", url: "/" }), true);
  assert.equal(isPublicRequest({ method: "POST", url: "/" }), false);
});
