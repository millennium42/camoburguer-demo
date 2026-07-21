export function createSseHub() {
  const channels = new Map();

  function subscribe(channel, reply) {
    if (!channels.has(channel)) channels.set(channel, new Set());
    channels.get(channel).add(reply);
    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed) reply.raw.write(": keepalive\n\n");
    }, 25_000);
    heartbeat.unref();
    reply.raw.on("close", () => {
      clearInterval(heartbeat);
      channels.get(channel)?.delete(reply);
      if (channels.get(channel)?.size === 0) channels.delete(channel);
    });
  }

  function publish(channel, payload) {
    const replies = channels.get(channel);
    if (!replies) return;
    const serialized = `data: ${JSON.stringify(payload)}\n\n`;
    for (const reply of replies) {
      if (reply.raw.destroyed) replies.delete(reply);
      else reply.raw.write(serialized);
    }
  }

  return { subscribe, publish };
}
