import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDb } from "../apps/api/src/db.js";
import { fingerprint, orderFingerprintPayload } from "../apps/api/src/idempotency.js";
import { normalizeStandaloneOrderDto } from "../packages/domain/index.js";
import { createPostgresFixture } from "./helpers/postgres-fixture.js";

test("DTO de pedido avulso repudia propriedades estruturais isoladas", () => {
  for (const field of ["tabId", "roundNumber", "roundKind", "reversesOrderId"]) {
    assert.throws(
      () => normalizeStandaloneOrderDto({ items: [], [field]: "infiltrado" }),
      (err) => {
        return err.statusCode === 400 && err.code === "STRUCTURAL_FIELDS_FORBIDDEN";
      },
    );
  }
});

test("DTO de pedido avulso repudia combinacao de propriedades estruturais", () => {
  assert.throws(
    () =>
      normalizeStandaloneOrderDto({
        items: [],
        tabId: "tab-1",
        roundNumber: 2,
        roundKind: "cancellation",
        reversesOrderId: "order-orig",
      }),
    (err) => {
      return err.statusCode === 400 && err.code === "STRUCTURAL_FIELDS_FORBIDDEN";
    },
  );
});

test("DTO de pedido avulso repudia propriedades estranhas ou forjadas nao-comerciais", () => {
  assert.throws(
    () =>
      normalizeStandaloneOrderDto({
        items: [],
        forgedDiscount: 1000,
        adminBonus: true,
      }),
    (err) => {
      return err.statusCode === 400 && err.code === "UNKNOWN_FIELD";
    },
  );
});

test("DTO de pedido avulso impoe defaults estruturais soberanos e expurga variacoes", () => {
  const normalized = normalizeStandaloneOrderDto({
    items: [{ sku: "x", quantity: 1 }],
    customerName: "Ana",
    source: "counter",
  });
  assert.deepEqual(normalized.items, [{ sku: "x", quantity: 1 }]);
  assert.equal(normalized.customerName, "Ana");
  assert.equal(normalized.source, "counter");

  // Confirma imposicao estrita dos defaults avulsos na raiz do objeto
  assert.equal(normalized.tabId, null);
  assert.equal(normalized.roundNumber, null);
  assert.equal(normalized.roundKind, "production");
  assert.equal(normalized.reversesOrderId, null);
});

test("Fingerprint criptografico consolida roundNumber e roundKind para alinhamento com DTO e banco", () => {
  const dtoAvulso = normalizeStandaloneOrderDto({ items: [{ sku: "x", quantity: 1 }] });
  const payloadAvulso = orderFingerprintPayload(dtoAvulso);

  assert.equal(payloadAvulso.roundNumber, null);
  assert.equal(payloadAvulso.roundKind, "production");
  assert.equal(payloadAvulso.tabId, null);

  const payloadRodada = orderFingerprintPayload(
    { items: [{ sku: "x", quantity: 1 }], tabId: "t1", roundKind: "production" },
    { roundNumber: 2 },
  );
  assert.equal(payloadRodada.roundNumber, 2);
  assert.equal(payloadRodada.roundKind, "production");
  assert.equal(payloadRodada.tabId, "t1");

  // Mudanca no roundNumber altera a assinatura
  assert.notEqual(
    fingerprint(payloadRodada),
    fingerprint(
      orderFingerprintPayload(
        { items: [{ sku: "x", quantity: 1 }], tabId: "t1", roundKind: "production" },
        { roundNumber: 3 },
      ),
    ),
  );
});

const connectionString = process.env.TEST_DATABASE_URL;

if (connectionString) {
  test("h01 integracao: POST /orders bloqueia campos estruturais, mantendo estoque intacto e rotas avulsas/dedicadas perenes", async (t) => {
    let target;
    let pool;
    let fixture;
    let _adminToken;
    let authHeader;
    const port = 34991;

    t.before(async () => {
      console.log("t.before start");
      fixture = await createPostgresFixture(connectionString, {
        controlDatabase: "camoburguer_auto_seed_test",
      });
      pool = fixture.pool;
      const db = createDb(fixture.connectionString);
      try {
        await db.init();
      } finally {
        await db.close();
      }

      console.log("Hashing password");
      const pass = await import("../apps/api/src/auth.js").then((m) => m.hashPassword("test1234"));
      console.log("Inserting user");
      const _user = await pool.query(
        "INSERT INTO users (id, name, email, role, username, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [randomUUID(), "Admin", "admin@demo.local", "admin", "admin-h01", pass],
      );
      await pool.query(
        "INSERT INTO stock_balances (category, quantity) VALUES ('xis', 100) ON CONFLICT (category) DO UPDATE SET quantity = 100",
      );

      console.log("Spawning server");
      const dir = await mkdtemp(join(tmpdir(), "camoburguer-h01-"));
      target = spawn(process.execPath, ["apps/api/src/server.js"], {
        env: {
          ...process.env,
          PORT: String(port),
          DATABASE_URL: fixture.connectionString,
          DATA_DIRECTORY: dir,
        },
      });

      await new Promise((resolve, reject) => {
        target.stdout.on("data", (data) => {
          if (data.toString().includes(String(port))) resolve();
        });
        target.stderr.on("data", (data) => {
          console.error("SERVER ERROR:", data.toString());
        });
        target.on("exit", (code) => {
          if (code !== 0) reject(new Error(`Server exited with code ${code}`));
        });
      });

      const loginRes = await fetch(`http://127.0.0.1:${port}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin-h01", password: "test1234" }),
      });
      const setCookies = loginRes.headers.getSetCookie?.() || [
        loginRes.headers.get("set-cookie") || "",
      ];
      const cookie = setCookies
        .map((value) => value.split(";")[0])
        .filter(Boolean)
        .join("; ");
      const { csrfToken } = await loginRes.json();
      authHeader = {
        Cookie: cookie,
        "x-csrf-token": csrfToken,
        "Content-Type": "application/json",
      };
    });

    t.after(async () => {
      try {
        if (target && target.exitCode === null && target.signalCode === null) {
          const exited = new Promise((resolve) => target.once("exit", resolve));
          target.kill();
          await exited;
        }
      } finally {
        await fixture?.close();
      }
    });

    await t.test("Rejeita payload com tabId (400) e nao afeta o banco", async () => {
      const idempKey = `h01-test-${randomUUID()}`;
      const res = await fetch(`http://127.0.0.1:${port}/orders`, {
        method: "POST",
        headers: { ...authHeader, "Idempotency-Key": idempKey },
        body: JSON.stringify({ items: [{ sku: "x-simples", quantity: 1 }], tabId: "fake-tab-id" }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.code, "STRUCTURAL_FIELDS_FORBIDDEN");

      // Verifica no banco (estoque, ordem, idempotencia)
      const stock = await pool.query("SELECT * FROM stock_movements");
      assert.equal(stock.rows.length, 0); // Sem registro
      const idem = await pool.query(
        "SELECT * FROM idempotency_records WHERE idempotency_key = $1",
        [idempKey],
      );
      assert.equal(idem.rows.length, 0); // Sem lock deixado
    });

    await t.test("Rejeita payload com roundKind (400)", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/orders`, {
        method: "POST",
        headers: { ...authHeader, "Idempotency-Key": `h01-${randomUUID()}` },
        body: JSON.stringify({
          items: [{ sku: "x-simples", quantity: 1 }],
          roundKind: "cancellation",
        }),
      });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).code, "STRUCTURAL_FIELDS_FORBIDDEN");
    });

    await t.test("Rejeita payload com propriedade desconhecida (400)", async () => {
      const res = await fetch(`http://127.0.0.1:${port}/orders`, {
        method: "POST",
        headers: { ...authHeader, "Idempotency-Key": `h01-${randomUUID()}` },
        body: JSON.stringify({
          items: [{ sku: "x-simples", quantity: 1 }],
          forceAdminOverride: true,
        }),
      });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).code, "UNKNOWN_FIELD");
    });

    await t.test(
      "Aceita DTO avulso e aplica idempotencia validada com fingerprint exato",
      async () => {
        const idempKey = `h01-legitimo-${randomUUID()}`;
        const payload = {
          items: [{ sku: "x-simples", quantity: 1 }],
          source: "counter",
          customerName: "Joao",
        };

        // 1. Criacao normal
        const res = await fetch(`http://127.0.0.1:${port}/orders`, {
          method: "POST",
          headers: { ...authHeader, "Idempotency-Key": idempKey },
          body: JSON.stringify(payload),
        });
        const resBody = await res.text();
        console.log("RESPONSE BODY:", resBody);
        assert.equal(res.status, 201);
        const created = JSON.parse(resBody);
        assert.equal(created.tabId, null);
        assert.equal(created.roundKind, "production");

        // 2. Replay Idempotente
        const resReplay = await fetch(`http://127.0.0.1:${port}/orders`, {
          method: "POST",
          headers: { ...authHeader, "Idempotency-Key": idempKey },
          body: JSON.stringify(payload),
        });
        assert.equal(resReplay.status, 201);
        const replayed = await resReplay.json();
        assert.equal(replayed.id, created.id);
      },
    );
  });
} else {
  console.log("﹣ PostgreSQL efêmero requer TEST_DATABASE_URL (h01 integracao pular)");
}
