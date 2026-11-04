import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { rsvpSchema, songSchema, type RSVPInput } from "../lib/validation";
import {
  saveGuestRequest,
  reviewGuestRequest,
  consumeLimit,
  storageAvailable,
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
  for (const migration of readdirSync("db/migrations").sort())
    await db.exec(readFileSync(`db/migrations/${migration}`, "utf8"));
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
  await reviewGuestRequest(db, first.id, "approved");
  assert.equal(
    (
      await db.query<any>(
        "select sum(jsonb_array_length(members))::int n from lola15.rsvps where status='approved' and attending",
      )
    ).rows[0].n,
    1,
  );
  await saveGuestRequest(db, "rsvp", decline, "fixture");
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
  await reviewGuestRequest(db, first.id, "approved");
  await saveGuestRequest(db, "rsvp", second, "fixture");
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

test("a representative can identify themselves without being counted as a guest; duplicate people and zero phones are rejected", async () => {
  const data = response({
    contactName: "  Madre   de prueba  ",
    members: [{ name: "Hija invitada", menu: "vegetarian", notes: "" }],
  });
  assert.equal(data.contactName, "Madre de prueba");
  await saveGuestRequest(db, "rsvp", data, "proxy");
  await reviewGuestRequest(db, data.id, "approved", "pending");
  const stored = (
    await db.query<any>("select contact_name,members from lola15.rsvps")
  ).rows[0];
  assert.equal(stored.contact_name, "Madre de prueba");
  assert.deepEqual(
    stored.members.map((person: any) => person.name),
    ["Hija invitada"],
  );
  assert.throws(() =>
    response({
      members: [
        { name: "Ana Lopez", menu: "standard", notes: "" },
        { name: " ana   lopez ", menu: "vegan", notes: "" },
      ],
    }),
  );
  assert.throws(() => response({ phone: "0000000000" }));
});
test("reusing an id with different data reports a conflict and never silently discards an edit", async () => {
  const data = response();
  await saveGuestRequest(db, "rsvp", data, "fixture");
  await assert.rejects(
    saveGuestRequest(
      db,
      "rsvp",
      {
        ...data,
        members: [{ name: "Persona corregida", menu: "vegan", notes: "" }],
      },
      "fixture",
    ),
    /IDEMPOTENCY_CONFLICT/,
  );
  assert.equal(
    (await db.query<any>("select members from lola15.rsvps")).rows[0].members[0]
      .name,
    "Persona de prueba",
  );
});
test("old pending responses, replaced approvals and stale review screens cannot overwrite the latest decision", async () => {
  const first = response();
  await saveGuestRequest(db, "rsvp", first, "fixture");
  const latest = response();
  await saveGuestRequest(db, "rsvp", latest, "fixture");
  await db.query(
    "update lola15.rsvps set created_at=now()-interval '1 minute' where id=$1",
    [first.id],
  );
  await assert.rejects(
    reviewGuestRequest(db, first.id, "approved", "pending"),
    /NEWER_RESPONSE/,
  );
  await reviewGuestRequest(db, latest.id, "approved", "pending");
  await assert.rejects(
    reviewGuestRequest(db, latest.id, "rejected", "pending"),
    /STALE_REVIEW/,
  );
  const correction = response();
  await saveGuestRequest(db, "rsvp", correction, "fixture");
  await db.query(
    "update lola15.rsvps set created_at=now()+interval '1 minute' where id=$1",
    [correction.id],
  );
  await reviewGuestRequest(db, correction.id, "approved", "pending");
  await assert.rejects(
    reviewGuestRequest(db, latest.id, "approved"),
    /OBSOLETE_RESPONSE/,
  );
  assert.equal(
    (
      await db.query<any>(
        "select count(*)::int n from lola15.rsvps where status='approved'",
      )
    ).rows[0].n,
    1,
  );
});
test("the upgrade normalizes contact spacing and preserves historical responses while repairing duplicate approvals", async () => {
  await db.exec("drop index lola15.lola15_one_approved_response;");
  const earlier = response(),
    later = response();
  for (const [data, name, date] of [
    [earlier, "Persona  de prueba", "2026-11-01T00:00:00Z"],
    [later, "persona de prueba", "2026-11-02T00:00:00Z"],
  ] as const)
    await db.query(
      "insert into lola15.rsvps(id,contact_name,phone,attending,members,status,created_at) values($1,$2,$3,true,$4::jsonb,'approved',$5)",
      [data.id, name, data.phone, JSON.stringify(data.members), date],
    );
  await db.exec(
    readFileSync("db/migrations/202611040002_review_identity.sql", "utf8"),
  );
  const rows = (await db.query<any>("select id,status from lola15.rsvps")).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.id === earlier.id).status, "superseded");
  assert.equal(rows.find((row) => row.id === later.id).status, "approved");
});
test("storage readiness fails if any RSVP, song, session or limit table is missing", async () => {
  assert.equal(await storageAvailable(db), true);
  for (const table of ["rsvps", "songs", "sessions", "rate_limits"]) {
    await db.exec(`begin;drop table lola15.${table};`);
    assert.equal(await storageAvailable(db), false);
    await db.exec("rollback");
  }
  assert.equal(await storageAvailable(db), true);
});
