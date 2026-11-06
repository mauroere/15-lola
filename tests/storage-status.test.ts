import { test } from "node:test";
import assert from "node:assert/strict";
import { storageErrorCode } from "../lib/storage-status";
test("database diagnostics distinguish configuration, schema, authentication and permissions without exposing driver messages", () => {
  assert.equal(storageErrorCode({ code: "42P01" }), "SCHEMA_NOT_READY");
  assert.equal(storageErrorCode({ code: "3F000" }), "SCHEMA_NOT_READY");
  assert.equal(
    storageErrorCode({ code: "28P01" }),
    "DATABASE_AUTHENTICATION_FAILED",
  );
  assert.equal(
    storageErrorCode({ code: "42501" }),
    "DATABASE_PERMISSION_DENIED",
  );
  assert.equal(
    storageErrorCode({
      code: "ERR_INVALID_URL",
      input: "postgres\\://fixture:private-test@example.com/db",
    }),
    "DATABASE_URL_INVALID",
  );
  assert.equal(
    storageErrorCode({ message: "fixture-private-connection" }),
    "DATABASE_UNAVAILABLE",
  );
  assert.equal(storageErrorCode(null), "DATABASE_UNAVAILABLE");
});
