import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import "dotenv/config";
import Fastify from "fastify";
import { equalSecret, safeId, validPrintContent } from "./validation.js";

const app = Fastify({ logger: true, bodyLimit: 128 * 1024 });
const port = Number(process.env.PORT || 3100);
const spoolDir = process.env.PRINT_SPOOL_DIR || join(process.cwd(), "spool");
const bridgeToken = String(process.env.PRINT_BRIDGE_TOKEN || "").trim();

if (process.env.NODE_ENV === "production" && !bridgeToken) {
  throw new Error("PRINT_BRIDGE_TOKEN é obrigatório em produção");
}

await mkdir(spoolDir, { recursive: true });

app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("x-content-type-options", "nosniff");
  reply.header("cache-control", "no-store");
  return payload;
});

app.get("/health", async () => ({ ok: true, service: "print-bridge" }));

app.post("/print-jobs", async (request, reply) => {
  if (bridgeToken && !equalSecret(request.headers.authorization, `Bearer ${bridgeToken}`)) {
    return reply.code(401).send({ error: "Não autorizado" });
  }

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
    status: "printed",
    printerName: String(body.printerName || "cozinha-principal").slice(0, 128),
    attempts: repeated ? 0 : 1,
    repeated,
    metadata: {
      spooled: true,
      reason: String(body.reason || "confirmed").slice(0, 64)
    }
  });
});

await app.listen({ host: "0.0.0.0", port });
