import { execFileSync } from "node:child_process";

const fixtureName = /^camoburguer_fixture_[a-f0-9]{24}_test$/;
const identitySql = `SELECT json_build_object('database', current_database(),
  'system', system_identifier::text, 'version', current_setting('server_version')) AS identity
  FROM pg_control_system()`;

// Test-only: both databases must have been created by createPostgresFixture.
// No --clean, --create, disk archive or operation against a shared database.
export async function restoreFixtureBackup(container, source, target, execute = execFileSync) {
  if (
    !fixtureName.test(source?.databaseName) ||
    !fixtureName.test(target?.databaseName) ||
    source.databaseName === target.databaseName
  )
    throw new Error("unsafe restore target");
  const {
    rows: [state],
  } = await target.pool.query(`
    SELECT current_database() AS database,
      (EXISTS(SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace)
       OR EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace)) AS populated
  `);
  if (state.populated) throw new Error("unsafe restore: target is not empty");
  if (
    state.database !== target.databaseName ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(container || "")
  ) {
    throw new Error("unsafe restore identity");
  }
  const docker = (args, options = {}) => {
    try {
      return execute("docker", args, {
        timeout: 30000,
        maxBuffer: 16 * 1024 * 1024,
        ...options,
      });
    } catch {
      throw new Error("isolated backup/restore command failed");
    }
  };
  const metadata = JSON.parse(
    docker(
      [
        "inspect",
        "--format",
        '{"id":"{{.Id}}","image":"{{.Config.Image}}","scope":"{{index .Config.Labels "camoburguer.scope"}}","project":"{{index .Config.Labels "com.docker.compose.project"}}"}',
        container,
      ],
      { encoding: "utf8" },
    ),
  );
  if (
    metadata.image !== "postgres:16.14-alpine" ||
    (metadata.scope !== "bloco2-test" && metadata.project !== "camoburguer-auto-seed-test")
  ) {
    throw new Error("unsafe restore container");
  }
  const command = (program, database, args, input = false) => [
    "exec",
    ...(input ? ["-i"] : []),
    metadata.id,
    "env",
    "-i",
    "PATH=/usr/local/bin:/usr/bin:/bin",
    "PGPASSWORD=camoburguer",
    program,
    "-h",
    "127.0.0.1",
    "-p",
    "5432",
    "-U",
    "camoburguer",
    "--dbname",
    database,
    ...args,
  ];
  let sourceIdentity;
  for (const fixture of [source, target]) {
    const expected = (await fixture.pool.query(identitySql)).rows[0].identity;
    const actual = JSON.parse(
      docker(command("psql", fixture.databaseName, ["-X", "-Atc", identitySql]), {
        encoding: "utf8",
      }),
    );
    if (
      expected.database !== fixture.databaseName ||
      actual.database !== expected.database ||
      actual.system !== expected.system ||
      actual.version !== expected.version ||
      (sourceIdentity && actual.system !== sourceIdentity)
    ) {
      throw new Error("unsafe restore: database/cluster identity mismatch");
    }
    sourceIdentity = actual.system;
  }
  const archive = docker(
    command("pg_dump", source.databaseName, ["--format=custom", "--no-owner", "--no-acl"]),
  );
  docker(
    command(
      "pg_restore",
      target.databaseName,
      ["--single-transaction", "--exit-on-error", "--no-owner", "--no-acl"],
      true,
    ),
    { input: archive },
  );
  return { archiveBytes: archive.length };
}
