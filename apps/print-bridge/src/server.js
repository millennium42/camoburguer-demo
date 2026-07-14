import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import Fastify from "fastify";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT || 3100);
const spoolDir = process.env.PRINT_SPOOL_DIR || join(process.cwd(), "spool");

await mkdir(spoolDir, { recursive: true });

app.get("/health", async () => ({ ok: true, service: "print-bridge", spoolDir }));

app.post("/print-jobs", async (request, reply) => {
  const body = request.body || {};
  const jobId = body.jobId || randomUUID();
  const filename = `${body.orderId}-${jobId}.txt`;
  const filepath = join(spoolDir, filename);
  try {
    await writeFile(filepath, body.content || "", { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }

  return reply.code(201).send({
    id: jobId,
    status: "printed",
    printerName: body.printerName || "cozinha-principal",
    attempts: 1,
    metadata: {
      filepath,
      reason: body.reason || "confirmed"
    }
  });
});

app.listen({ host: "0.0.0.0", port });
