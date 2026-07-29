import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import "dotenv/config";
import Fastify from "fastify";
import { equalSecret, safeId, validPrintContent } from "./validation.js";

const app = Fastify({ logger: true, bodyLimit: 128 * 1024 });
const port = Number(process.env.PORT || 3100);
const spoolDir = process.env.PRINT_SPOOL_DIR || join(process.cwd(), "spool");
const bridgeToken = String(process.env.PRINT_BRIDGE_TOKEN || "").trim();
const insecureLocal = process.env.PRINT_BRIDGE_INSECURE_LOCAL === "true";

if (!bridgeToken && !insecureLocal) {
  throw new Error("PRINT_BRIDGE_TOKEN é obrigatório por padrão. Use PRINT_BRIDGE_INSECURE_LOCAL=true apenas para desenvolvimento local.");
}

await mkdir(spoolDir, { recursive: true });

app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("x-content-type-options", "nosniff");
  reply.header("cache-control", "no-store");
  return payload;
});

app.get("/health", async () => ({ ok: true, service: "print-bridge" }));

function authorize(request, reply) {
  if (insecureLocal && !bridgeToken) return true;
  if (!bridgeToken || !equalSecret(request.headers.authorization, `Bearer ${bridgeToken}`)) {
    reply.code(401).send({ error: "Não autorizado" });
    return false;
  }
  return true;
}

app.get("/print-jobs/:orderId/:jobId", async (request, reply) => {
  if (!authorize(request, reply)) return reply;
  const orderId = safeId(request.params.orderId, "orderId");
  const jobId = safeId(request.params.jobId, "jobId");
  try {
    const content = await readFile(join(spoolDir, `${orderId}-${jobId}.txt`), "utf8");
    return {
      id: jobId,
      status: "already_printed",
      receipt: createHash("sha256").update(content).digest("hex")
    };
  } catch (error) {
    if (error.code === "ENOENT") return reply.code(404).send({ error: "Recibo não encontrado" });
    throw error;
  }
});

app.post("/print-jobs", async (request, reply) => {
  if (!authorize(request, reply)) return reply;

  const body = request.body || {};
  const orderId = safeId(body.orderId, "orderId");
  const jobId = safeId(body.jobId, "jobId");
  const content = typeof body.content === "string" ? body.content : "";
  if (!validPrintContent(content)) {
    return reply.code(400).send({ error: "Conteúdo de impressão inválido" });
  }

  const filepath = join(spoolDir, `${orderId}-${jobId}.txt`);
  let repeated = false;
  try {
    await writeFile(filepath, content, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existingContent = await readFile(filepath, "utf8");
    if (existingContent !== content) {
      return reply.code(409).send({ error: "jobId já existe com conteúdo diferente" });
    }
    repeated = true;
  }

  return reply.code(repeated ? 200 : 201).send({
    id: jobId,
    status: repeated ? "already_printed" : "printed",
    printerName: String(body.printerName || "cozinha-principal").slice(0, 128),
    attempts: repeated ? 0 : 1,
    repeated,
    metadata: {
      spooled: true,
      reason: String(body.reason || "confirmed").slice(0, 64)
    }
  });
});

app.post("/privacy/anonymize", async (request, reply) => {
  if (!authorize(request, reply)) return reply;
  const artifacts = Array.isArray(request.body?.artifacts) ? request.body.artifacts : [];
  const sanitized = [];
  for (const artifact of artifacts) {
    const orderId = safeId(artifact.orderId, "orderId");
    const jobId = safeId(artifact.jobId, "jobId");
    const filepath = join(spoolDir, `${orderId}-${jobId}.txt`);
    try {
      await writeFile(filepath, "[TICKET ANONIMIZADO]\n", { encoding: "utf8", flag: "w" });
      sanitized.push(jobId);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return { ok: true, sanitized };
});

const host = (insecureLocal && !bridgeToken) ? "127.0.0.1" : "0.0.0.0";
if (insecureLocal && !bridgeToken) {
  app.log.warn("ATENÇÃO: print-bridge operando em modo INSEGURO no localhost.");
}
await app.listen({ host, port });
