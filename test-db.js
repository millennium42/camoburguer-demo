import pg from "pg";
const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
async function main() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT current_database() AS database,
           COALESCE(host(inet_server_addr()), 'local-socket') AS address,
           inet_server_port() AS port
  `);
  console.log(rows[0]);
  await client.end();
}
main().catch(console.error);
