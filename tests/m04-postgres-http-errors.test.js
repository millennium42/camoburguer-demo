import assert from "node:assert/strict";
import test from "node:test";
import fastify from "fastify";
import { createDb } from "../apps/api/src/db.js";
import { mapPostgresError } from "../apps/api/src/error-mapper.js";

const testDbUrl = process.env.TEST_DATABASE_URL;

test("M-04: PostgreSQL Error Mapper", {
  skip: !testDbUrl ? "PostgreSQL efêmero requer TEST_DATABASE_URL" : false,
}, async (t) => {
  const db = createDb(testDbUrl);
  await db.init();

  const app = fastify({ logger: false });

  // Utilizar o logger do fastify simulado (que é usado pelo mapPostgresError)
  app.setErrorHandler((error, request, reply) => {
    const { statusCode, payload } = mapPostgresError(error, {
      error: () => {},
      warn: () => {}, // Evitar poluir stdout durante o teste
    });
    return reply.code(statusCode).send(payload);
  });

  app.get("/domain", async () => {
    const err = new Error("Not Found Custom");
    err.statusCode = 404;
    throw err;
  });

  app.get("/22p02", async () => {
    // uuid invalido
    await db.query("SELECT 'nao-sou-uuid'::uuid");
  });

  app.get("/23505", async () => {
    try {
      await db.query(
        "INSERT INTO orders (id, status, source, fulfillment_mode, customer_name, created_at, updated_at) VALUES ('unique1', 'open', 'counter', 'local', 'test', now(), now()) ON CONFLICT DO NOTHING",
      );
      await db.query(
        "INSERT INTO orders (id, status, source, fulfillment_mode, customer_name, created_at, updated_at) VALUES ('unique1', 'open', 'counter', 'local', 'test', now(), now())",
      );
    } catch (e) {
      console.log("M04 ERROR:", e);
      throw e;
    }
  });

  app.get("/generic", async () => {
    throw new Error("Generic failure without postgres code");
  });

  await t.test("Erro customizado de domínio preserva status customizado (404)", async () => {
    const res = await app.inject({ method: "GET", url: "/domain" });
    assert.equal(res.statusCode, 404);
  });

  await t.test("22P02, 22007, 22008 (Tipos Inválidos) retorna 400", async () => {
    const res = await app.inject({ method: "GET", url: "/22p02" });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.message, "Dados ou tipos inválidos fornecidos");
    assert.equal(body.code, "INVALID_TYPE");
  });

  await t.test("23505 (Unique Constraint) retorna 409", async () => {
    const res = await app.inject({ method: "GET", url: "/23505" });
    assert.equal(res.statusCode, 409);
    const body = JSON.parse(res.payload);
    assert.equal(body.message, "Conflito de estado ou registro já existente");
    assert.equal(body.code, "UNIQUE_VIOLATION");
  });

  await t.test("Sanitização: Mensagem original não é exposta", async () => {
    const res = await app.inject({ method: "GET", url: "/22p02" });
    const text = res.payload;
    assert.equal(text.includes("invalid input syntax"), false, "A mensagem original do DB vazou!");
  });

  await t.test("Falha interna genérica retorna 500 sem expor código SQL", async () => {
    const res = await app.inject({ method: "GET", url: "/generic" });
    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.payload);
    assert.equal(body.message, "Erro interno do servidor");
  });

  // Limpeza
  await db.query("DELETE FROM orders WHERE id = 'unique1'");
});
