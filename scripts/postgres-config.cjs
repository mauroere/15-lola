const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { rootCertificates } = require("node:tls");
function connectionConfig(connection) {
  if (!connection) throw Error("DATABASE_NOT_CONFIGURED");
  const url = new URL(connection);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw Error("INVALID_DATABASE_URL");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "ssl"])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          servername: url.hostname,
          ca: [
            ...rootCertificates,
            ...["2021", "2025"].map((year) =>
              readFileSync(
                join(process.cwd(), `scripts/certs/prod-ca-${year}.crt`),
                "utf8",
              ),
            ),
          ],
        },
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  };
}
module.exports = { connectionConfig };
