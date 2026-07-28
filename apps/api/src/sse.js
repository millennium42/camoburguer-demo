export function createSseHub() {
  const channels = new Map();

  function remove(channel, subscription) {
    channels.get(channel)?.delete(subscription);
    if (channels.get(channel)?.size === 0) channels.delete(channel);
  }

  async function validateOrClose(channel, subscription) {
    if (subscription.reply.raw.destroyed) {
      remove(channel, subscription);
      return false;
    }
    try {
      if (await subscription.validate()) return true;
    } catch {
      // Falha fechada: indisponibilidade da sessao encerra o stream.
    }
    subscription.reply.raw.end();
    remove(channel, subscription);
    return false;
  }

  function subscribe(channel, reply, validate = async () => true) {
    if (!channels.has(channel)) channels.set(channel, new Set());
    const subscription = { reply, validate };
    channels.get(channel).add(subscription);
    const heartbeat = setInterval(async () => {
      if (await validateOrClose(channel, subscription)) reply.raw.write(": keepalive\n\n");
    }, 25_000);
    heartbeat.unref();
    reply.raw.on("close", () => {
      clearInterval(heartbeat);
      remove(channel, subscription);
    });
  }

  async function publish(channel, payload) {
    const subscriptions = channels.get(channel);
    if (!subscriptions) return;
    const serialized = `data: ${JSON.stringify(payload)}\n\n`;
    for (const subscription of [...subscriptions]) {
      if (await validateOrClose(channel, subscription)) subscription.reply.raw.write(serialized);
    }
  }

  return { subscribe, publish };
}
