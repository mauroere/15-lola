import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { rsvpSchema, songSchema, type RSVPInput } from "../lib/validation";
import {
  saveGuestRequest,
  reviewGuestRequest,
  consumeLimit,
} from "../lib/repository";
import { GET as calendar } from "../app/api/calendar/route";
let db: PGlite;
const response = (changes: Partial<RSVPInput> = {}) =>
  rsvpSchema.parse({
    id: randomUUID(),
    contactName: "Persona de prueba",
    phone: "+54 9 11 3154 5678",
    attending: true,
    members: [
      {
        name: "Persona de prueba",
        menu: "gluten_free",
        notes: "Sin contaminación cruzada",
      },
    ],
    website: "",
    ...changes,
  });
before(async () => {
  db = new PGlite();
  await db.exec(
    readFileSync("db/migrations/202611040001_guest_features.sql", "utf8"),
  );
  await db.exec("create role fixture_visitor nologin;");
});
after(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role;truncate lola15.rsvps,lola15.songs,lola15.rate_limits,lola15.sessions;",
  );
});
test("server schemas reject empty guests, bad phones, invalid menus, traps and excessive groups", () => {
  assert.throws(() => response({ phone: "bad phone" }));
  assert.throws(() => response({ members: [] }));
  assert.equal(
    rsvpSchema.safeParse({ ...response(), website: "spam" }).success,
    false,
  );
  assert.equal(
    rsvpSchema.safeParse({
      ...response(),
      members: [{ name: "Persona", menu: "invented", notes: "" }],
    }).success,
    false,
  );
  assert.equal(
    rsvpSchema.safeParse({
      ...response(),
      members: [{ name: "Persona", menu: "other", notes: "" }],
    }).success,
    false,
  );
  assert.throws(() =>
    response({
      members: Array.from({ length: 13 }, () => ({
        name: "Persona",
        menu: "standard",
        notes: "",
      })),
    }),
  );
  assert.equal(
    songSchema.safeParse({
      id: randomUUID(),
      name: "Persona",
      song: "  ",
      website: "",
    }).success,
    false,
  );
});
test("RSVP stores names and per-person menus privately as pending; retry is idempotent", async () => {
  const data = response();
  await saveGuestRequest(db, "rsvp", data, "fixture");
  await saveGuestRequest(db, "rsvp", data, "fixture");
  const { rows } = await db.query<any>("select * from lola15.rsvps");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "pending");
  assert.equal(rows[0].members[0].menu, "gluten_free");
  assert.equal(rows[0].phone, "5491131545678");
  assert.equal(
    (await db.query<any>("select count from lola15.rate_limits")).rows[0].count,
    1,
  );
});
test("failed write rolls back the response and rate counter", async () => {
  const data = response();
  const original = db.query.bind(db);
  const client = {
    query: async (sql: string, values?: any[]) => {
      if (sql.startsWith("insert into lola15.rsvps"))
        throw Error("fixture write failure");
      return original(sql, values);
    },
  };
  await assert.rejects(saveGuestRequest(client, "rsvp", data, "fixture"));
  assert.equal(
    (await db.query<any>("select count(*)::int n from lola15.rsvps")).rows[0].n,
    0,
  );
  assert.equal(
    (await db.query<any>("select count(*)::int n from lola15.rate_limits"))
      .rows[0].n,
    0,
  );
});
test("approval counts exactly one active response; a later decline replaces it without deleting history", async () => {
  const first = response(),
    decline = response({ attending: false, members: [] });
  await saveGuestRequest(db, "rsvp", first, "fixture");
  await saveGuestRequest(db, "rsvp", decline, "fixture");
  await reviewGuestRequest(db, first.id, "approved");
  assert.equal(
    (
      await db.query<any>(
        "select sum(jsonb_array_length(members))::int n from lola15.rsvps where status='approved' and attending",
      )
    ).rows[0].n,
    1,
  );
  await reviewGuestRequest(db, decline.id, "approved");
  const { rows } = await db.query<any>("select id,status from lola15.rsvps");
  assert.equal(rows.find((row) => row.id === first.id).status, "superseded");
  assert.equal(rows.find((row) => row.id === decline.id).status, "approved");
  assert.equal(
    (
      await db.query<any>(
        "select count(*)::int n from lola15.rsvps where status='approved' and attending",
      )
    ).rows[0].n,
    0,
  );
});
test("rejected requests never contribute to catering; review failure rolls back previous approval", async () => {
  const first = response(),
    second = response();
  await saveGuestRequest(db, "rsvp", first, "fixture");
  await saveGuestRequest(db, "rsvp", second, "fixture");
  await reviewGuestRequest(db, first.id, "approved");
  const original = db.query.bind(db);
  const client = {
    query: async (sql: string, args?: any[]) => {
      if (sql.startsWith("update lola15.rsvps set status=$2"))
        throw Error("fixture review failure");
      return original(sql, args);
    },
  };
  await assert.rejects(reviewGuestRequest(client, second.id, "approved"));
  assert.equal(
    (
      await db.query<any>("select status from lola15.rsvps where id=$1", [
        first.id,
      ])
    ).rows[0].status,
    "approved",
  );
  await reviewGuestRequest(db, second.id, "rejected");
  assert.equal(
    (
      await db.query<any>("select status from lola15.rsvps where id=$1", [
        second.id,
      ])
    ).rows[0].status,
    "rejected",
  );
});
test("song writes are idempotent and input SQL stays data", async () => {
  const data = songSchema.parse({
    id: randomUUID(),
    name: "Persona local",
    song: "Test'); DROP TABLE lola15.songs; --",
    website: "",
  });
  await saveGuestRequest(db, "song", data, "fixture");
  await saveGuestRequest(db, "song", data, "fixture");
  const { rows } = await db.query<any>("select song from lola15.songs");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].song, data.song);
});
test("rate limits enforce the boundary in PostgreSQL", async () => {
  assert.equal(await consumeLimit(db, "fixture", 2), true);
  assert.equal(await consumeLimit(db, "fixture", 2), true);
  assert.equal(await consumeLimit(db, "fixture", 2), false);
});
test("unprivileged visitors cannot read guest, menu, song or session data", async () => {
  await db.exec("set role fixture_visitor");
  for (const table of ["rsvps", "songs", "sessions"])
    await assert.rejects(
      db.query(`select * from lola15.${table}`),
      /permission denied/,
    );
  await db.exec("reset role");
});
test("calendar uses 21:00 Argentina and the confirmed venue without inventing an end time", async () => {
  const result = calendar();
  assert.equal(result.status, 200);
  const text = await result.text();
  assert.match(text, /DTSTART:20270208T000000Z/);
  assert.match(text, /LOCATION:La Quinta Eventos/);
  assert.doesNotMatch(text, /DTEND/);
  for (const line of text.split("\r\n"))
    assert(Buffer.byteLength(line, "utf8") <= 75);
});

test("remote PostgreSQL connections always verify TLS; only loopback permits plaintext", async () => {
  const { connectionConfig } = await import("../scripts/postgres-config.cjs");
  const remote = connectionConfig(
    "postgres://fixture:local-test@db.example.com/postgres?sslmode=disable",
  );
  assert(remote.ssl && typeof remote.ssl === "object");
  assert.equal(remote.ssl.rejectUnauthorized, true);
  assert.equal(remote.ssl.servername, "db.example.com");
  assert(!remote.connectionString.includes("sslmode"));
  assert.equal(
    connectionConfig("postgres://fixture:local-test@127.0.0.1/postgres").ssl,
    false,
  );
});
