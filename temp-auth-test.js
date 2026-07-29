import 'dotenv/config';
import Fastify from 'fastify';
import { equalSecret } from './apps/print-bridge/src/validation.js';
const bridgeToken = 'test-token';
const insecureLocal = false;
const app = Fastify();
function authorize(request, reply) {
  if (insecureLocal && !bridgeToken) return true;
  if (!bridgeToken || !equalSecret(request.headers.authorization, 'Bearer test-token')) {
    reply.code(401).send({ error: 'Não autorizado' });
    return false;
  }
  return true;
}
app.get('/print-jobs/:a/:b', (req, reply) => {
  if (!authorize(req, reply)) return;
  reply.send({ ok: true });
});
await app.listen({ port: 0 });
const addr = app.server.address();
const r1 = await fetch('http://127.0.0.1:' + addr.port + '/print-jobs/1/2');
if (r1.status !== 401) process.exit(101);
const r2 = await fetch('http://127.0.0.1:' + addr.port + '/print-jobs/1/2', { headers: { authorization: 'Bearer wrong' }});
if (r2.status !== 401) process.exit(102);
const r3 = await fetch('http://127.0.0.1:' + addr.port + '/print-jobs/1/2', { headers: { authorization: 'Bearer test-token' }});
if (r3.status !== 200) process.exit(103);
process.exit(0);
