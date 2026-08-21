import { printSimulationSummary, runSimulation } from "./demo-simulator-client.mjs";

try {
  const summary = await runSimulation({
    baseUrl: process.env.API_BASE_URL || "http://127.0.0.1:3001",
    username: process.env.DEMO_ADMIN_USERNAME || "admin",
    password: process.env.DEMO_ADMIN_PASSWORD,
    timeoutMs: Number(process.env.SIMULATOR_TIMEOUT_MS || 5_000),
  });
  printSimulationSummary(summary);
} catch (error) {
  printSimulationSummary(
    error.summary || { ok: false, steps: { startup: { status: "failed", detail: error.message } } },
  );
  process.exitCode = 1;
}
