const { Client } = require("pg");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
const { connectionConfig } = require("./postgres-config.cjs");
async function main() {
  const connection =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  if (!connection) {
    console.log(
      "No database binding: guest forms remain unavailable until connected.",
    );
    return;
  }
  const client = new Client(connectionConfig(connection));
  try {
    await client.connect();
    await client.query("set lock_timeout='15s'");
    await client.query("select pg_advisory_lock(27020721)");
    await client.query(
      "create schema if not exists lola15; revoke all on schema lola15 from public; create table if not exists lola15.migrations(id text primary key,checksum text not null); alter table lola15.migrations enable row level security;",
    );
    const dir = join(__dirname, "../db/migrations");
    for (const name of readdirSync(dir)
      .filter((name) => /^\d+_.*\.sql$/.test(name))
      .sort()) {
      const sql = readFileSync(join(dir, name), "utf8"),
        checksum = createHash("sha256").update(sql).digest("hex");
      const { rows } = await client.query(
        "select checksum from lola15.migrations where id=$1",
        [name],
      );
      if (rows.length) {
        if (rows[0].checksum !== checksum)
          throw Error("MIGRATION_CHECKSUM_MISMATCH");
        continue;
      }
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into lola15.migrations values($1,$2)", [
          name,
          checksum,
        ]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      console.log("Applied migration:", name);
    }
  } finally {
    await client.end().catch(() => {});
  }
}
main().catch(() => {
  console.error(
    "Migration failed; deployment stopped. Verify the Lola database binding and TLS configuration.",
  );
  process.exitCode = 1;
});
