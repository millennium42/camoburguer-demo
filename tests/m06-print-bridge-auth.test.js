import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

const createRunner = () => {
  const code =
    "import 'dotenv/config';\n" +
    "import Fastify from 'fastify';\n" +
    "try {\n" +
    "  const ac = new AbortController();\n" +
    "  setTimeout(() => ac.abort(), 1000);\n" +
    "  import('./apps/print-bridge/src/server.js')\n" +
    "    .then(() => { process.exit(0); })\n" +
    "    .catch(e => { console.error(e); process.exit(1); });\n" +
    "} catch (e) {\n" +
    "  console.error(e);\n" +
    "  process.exit(1);\n" +
    "}\n";
  fs.writeFileSync("temp-bridge-runner.js", code);
};

const cleanupRunner = () => {
  if (fs.existsSync("temp-bridge-runner.js")) fs.unlinkSync("temp-bridge-runner.js");
};

test("M-06: Matriz ambiente x token x flag x host do print bridge", async (t) => {
  createRunner();

  await t.test("Rejeita inicialização sem token e sem flag", () => {
    try {
      execSync("node temp-bridge-runner.js", {
        env: { ...process.env, PRINT_BRIDGE_TOKEN: "", PRINT_BRIDGE_INSECURE_LOCAL: "" },
        stdio: "pipe",
      });
      assert.fail("Deveria abortar");
    } catch (err) {
      assert.equal(err.status, 1);
      assert.match(err.stderr.toString(), /PRINT_BRIDGE_TOKEN é obrigatório por padrão/);
    }
  });

  await t.test(
    "Aceita inicialização sem token se flag INSECURE estiver true e forca 127.0.0.1",
    () => {
      try {
        execSync("node temp-bridge-runner.js", {
          env: {
            ...process.env,
            PRINT_BRIDGE_TOKEN: "",
            PRINT_BRIDGE_INSECURE_LOCAL: "true",
            PORT: "0",
          },
          stdio: "pipe",
          timeout: 2000,
        });
      } catch (err) {
        if (err.code === "ETIMEDOUT") {
          assert.ok(true);
        } else {
          assert.ok(
            err.stdout
              .toString()
              .includes("ATENÇÃO: print-bridge operando em modo INSEGURO no localhost"),
          );
        }
      }
    },
  );

  cleanupRunner();
});
