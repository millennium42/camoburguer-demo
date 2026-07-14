const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3001";

async function waitForApi() {
  for (let index = 0; index < 20; index += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error("API não respondeu a tempo");
}

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}

async function patch(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}

await waitForApi();

const shift = await post("/cash-shifts/open", {
  openingAmount: 120
});

const order = await post("/orders", {
  idempotencyKey: `seed-${Date.now()}`,
  source: "whatsapp",
  customerName: "Cliente Demo",
  fulfillmentMode: "pickup",
  paymentMethod: "pix",
  items: [
    { sku: "hamburguer-artesanal", name: "Hambúrguer Artesanal", quantity: 1, price: 31.9 },
    { sku: "batata-frita", name: "Batata Frita", quantity: 1, price: 16.9 }
  ]
});

await patch(`/orders/${order.id}/status`, { status: "in_preparation" });
await patch(`/orders/${order.id}/status`, { status: "ready" });
await patch(`/orders/${order.id}/status`, { status: "completed" });

await post(`/cash-shifts/${shift.id}/adjustments`, {
  kind: "withdrawal",
  amount: 20,
  reason: "Sangria demo"
});

console.log("Seed concluído");
