import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const zone = "America/Sao_Paulo";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("all application images pin the process timezone", () => {
  for (const app of ["api", "print-bridge", "event-simulator"]) {
    assert.match(read(`apps/${app}/Dockerfile`), /^ENV TZ=America\/Sao_Paulo$/m);
  }
});

test("Compose pins database startup and every service timezone", () => {
  const compose = read("docker-compose.yml");
  assert.equal(compose.match(/TZ: America\/Sao_Paulo/g)?.length, 4);
  assert.match(compose, /command: \["postgres", "-c", "timezone=America\/Sao_Paulo"\]/);
  assert.match(compose, /BUSINESS_TIME_ZONE: America\/Sao_Paulo/);
});

test("Render native services pin their process timezone without changing plans", () => {
  const blueprint = read("render.yaml");
  assert.equal(blueprint.match(/runtime: node/g)?.length, 2);
  assert.doesNotMatch(blueprint, /^\s+env: node/m);
  assert.equal(blueprint.match(/key: TZ\s+value: America\/Sao_Paulo/g)?.length, 2);
  assert.equal(blueprint.match(/plan: free/g)?.length, 3);
});

test("resolved Compose ignores conflicting host business timezone", {
  skip: process.env.TEST_COMPOSE_CONFIG !== "true",
}, () => {
  const result = spawnSync("docker", ["compose", "--profile", "*", "config", "--format", "json"], {
    encoding: "utf8",
    env: { ...process.env, BUSINESS_TIME_ZONE: "UTC" },
    timeout: 15000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, "docker compose config failed");
  const { services } = JSON.parse(result.stdout);
  assert.ok(services["event-simulator"], "include the optional simulator profile");
  for (const service of Object.values(services)) assert.equal(service.environment.TZ, zone);
  assert.equal(services.api.environment.BUSINESS_TIME_ZONE, zone);
  assert.deepEqual(services.db.command, ["postgres", "-c", `timezone=${zone}`]);
});
