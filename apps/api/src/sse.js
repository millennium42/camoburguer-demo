export function createSseHub() {
  const channels = new Map();

  function subscribe(channel, reply) {
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel).add(reply);
    reply.raw.on("close", () => {
      channels.get(channel)?.delete(reply);
    });
  }

  function publish(channel, payload) {
    const replies = channels.get(channel);
    if (!replies) return;
    const serialized = `data: ${JSON.stringify(payload)}\n\n`;
    for (const reply of replies) {
      reply.raw.write(serialized);
    }
  }

  return { subscribe, publish };
}
