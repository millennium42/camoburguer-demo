import test from "node:test";
import assert from "node:assert/strict";
import { login, authenticate, revokeSession } from "../apps/api/src/auth.js";

// Helper para expor acesso as variaveis que não sao exportadas para testarmos eviction indiretamente
// Na verdade, eviction em TtlCache remove a mais antiga.

test("M-07: loginAttempts respeita o limite maximo (eviction) e evita OOM", async () => {
  const db = { query: async () => ({ rows: [] }) };
  const now = new Date("2026-07-28T10:00:00Z");
  
  // 1. Bloquear o IP 'A'
  for (let i = 0; i < 5; i++) {
    await login(db, { username: "victim", password: "wrong", ip: "A", now });
  }
  const resultA = await login(db, { username: "victim", password: "wrong", ip: "A", now });
  assert.equal(resultA.rateLimited, true);

  // 2. Encher o cache com 10000 outras chaves (maxSize é 10000)
  for (let i = 0; i < 10000; i++) {
    await login(db, { username: "flood", password: "wrong", ip: `B${i}`, now });
  }

  // 3. IP 'A' deve ter sido evictado, logo um novo login nao estara mais rate limited
  const resultA2 = await login(db, { username: "victim", password: "wrong", ip: "A", now });
  assert.equal(resultA2.rateLimited, undefined); // Nao rate limited
});

test("M-07: revokedTokens respeita o limite maximo (eviction)", async () => {
  let dbQueries = 0;
  const db = { 
    query: async (sql) => {
      dbQueries++;
      // always return null / empty for simplicity in this mock
      return { rows: [] };
    } 
  };
  const now = new Date("2026-07-28T10:00:00Z");

  // 1. Revogar Token A
  await revokeSession(db, "token-A");
  
  // Reset dbQueries
  dbQueries = 0;

  // 2. Tentar autenticar Token A. Deve bater no cache local e retornar null IMEDIATAMENTE sem ir ao DB
  const authA = await authenticate(db, "token-A", now);
  assert.equal(authA, null);
  assert.equal(dbQueries, 0);

  // 3. Encher o cache de revogados com 10000 tokens
  for (let i = 0; i < 10000; i++) {
    await revokeSession(db, `token-B${i}`);
  }

  dbQueries = 0; // Reset after loop

  // 4. Token A foi evictado. Tentar autenticar deve agora IR AO BANCO verificar (já que nao ta no cache)
  await authenticate(db, "token-A", now);
  assert.equal(dbQueries, 1);
});

test("M-07: auth throtles writes to last_seen_at for SSE write amplification reduction", async () => {
  let updates = 0;
  const now = new Date("2026-07-28T10:00:00Z");
  
  const db = {
    query: async (sql, values) => {
      if (sql.startsWith("SELECT")) {
        return {
          rows: [{
            id: "s1",
            user_id: "u1",
            csrf_hash: "hash",
            expires_at: new Date(now.getTime() + 10000000).toISOString(),
            idle_expires_at: new Date(now.getTime() + 10000000).toISOString(),
            last_seen_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(), // Visto a 2 minutos
            username: "admin",
            role: "admin"
          }]
        };
      }
      if (sql.startsWith("UPDATE")) {
        updates++;
      }
      return { rows: [] };
    }
  };

  // Primeira chamada: last_seen_at foi há 2 minutos (menos que 5 minutos)
  await authenticate(db, "valid-token", now);
  assert.equal(updates, 0, "Nao deve atualizar DB se visto a menos de 5 minutos");

  // Segunda chamada simulando o tempo passando para 6 minutos depois da ultima vez q foi gravado
  const futureNow = new Date(now.getTime() + 4 * 60 * 1000); // 2 minutos atras + 4 minutos = 6 minutos
  await authenticate(db, "valid-token", futureNow);
  assert.equal(updates, 1, "Deve atualizar o DB pois ja se passaram mais de 5 minutos da ultima gravacao");
});
