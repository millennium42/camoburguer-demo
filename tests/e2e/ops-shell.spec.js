import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function adminPassword() {
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD || process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
  if (!password) {
    throw new Error("PLAYWRIGHT_ADMIN_PASSWORD ou ADMIN_BOOTSTRAP_PASSWORD e obrigatorio para o E2E autenticado.");
  }
  return password;
}

async function loginLegacyIfNeeded(page) {
  const dialog = page.locator("#login-dialog[open]");
  if (!(await dialog.isVisible())) return;

  await page.locator('#login-form input[name="username"]').fill("admin");
  await page.locator('#login-form input[name="password"]').fill(adminPassword());
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page.locator("#btn-logout")).toBeVisible();
}

async function login(page) {
  await page.goto("/app/");
  await expect(page.getByRole("heading", { name: /Gest.*Operacional/i })).toBeVisible();
  await loginLegacyIfNeeded(page);
  await expect(page.locator("#btn-logout")).toBeVisible();
}

async function expectNoSeriousA11y(page, label) {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || ""));
  expect(
    blocking,
    `${label} apresentou violacoes axe serias/criticas:\n${blocking
      .map((violation) => `- ${violation.id}: ${violation.help}`)
      .join("\n")}`
  ).toEqual([]);
}

test("console legado preserva acessibilidade minima no login e apos autenticacao @a11y", async ({ page }) => {
  await page.goto("/app/");
  await expect(page.getByRole("heading", { name: /Gest.*Operacional/i })).toBeVisible();
  await expectNoSeriousA11y(page, "Tela de login");

  await login(page);
  await expectNoSeriousA11y(page, "Console autenticado");
  await expect(page.locator(".tab-bar")).toBeVisible();
});

test("funil primario publicado fecha o ciclo login -> catalogo -> pedido no console legado", async ({ page }) => {
  const runId = Date.now();
  const customerName = `Playwright ${runId}`;

  await login(page);

  await page.locator("#btn-quick-new-order").click();
  await expect(page.locator("#order-modal")).toBeVisible();
  await page.locator('#order-form input[name="customerName"]').fill(customerName);
  await page.locator("#btn-open-catalog").click();
  await expect(page.locator("#catalog-modal")).toBeVisible();
  await page.locator("#catalog-modal-content button[data-add-direct]").first().click();
  await expect(page.locator("#order-items li")).toHaveCount(1);
  await page.locator("#close-catalog-modal").click();
  await page.locator('#order-form button[type="submit"]').click();

  await expect(page.locator("#feedback")).toContainText("Pedido finalizado e enviado para a cozinha.");
  await expect(page.getByText(customerName)).toBeVisible();
});
