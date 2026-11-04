import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Module from "node:module";
import path from "node:path";
import { build } from "esbuild";
let actions: any;
const state = () => (globalThis as any).__lolaActionFixture;
before(async () => {
  const result = await build({
    entryPoints: ["app/actions.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    plugins: [
      {
        name: "isolated-next",
        setup(build) {
          build.onResolve(
            {
              filter:
                /^(server-only|next\/headers|next\/cache|@\/lib\/database|\.\/database)$/,
            },
            (args) => ({ path: args.path, namespace: "fixture" }),
          );
          build.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            loader: "js",
            contents:
              args.path === "server-only"
                ? ""
                : args.path === "next/cache"
                  ? "export const revalidatePath=()=>{if(globalThis.__lolaActionFixture.failRefresh)throw Error('fixture refresh failure');};"
                  : args.path === "next/headers"
                    ? `export async function headers(){return new Map([['x-forwarded-for','127.0.0.1']]);}export async function cookies(){const s=globalThis.__lolaActionFixture;return {get:k=>s.cookies.get(k),set:(k,value,options)=>s.cookies.set(k,{value,options}),delete:k=>s.cookies.delete(k)};}`
                    : `
   export const databaseConfigured=()=>true;
   export const storageReady=async()=>globalThis.__lolaActionFixture.ready;
   async function query(sql,values=[]){const s=globalThis.__lolaActionFixture;s.calls.push({sql,values});
    if(sql.startsWith('insert into lola15.rate_limits'))return {rows:[{count:s.limit}]};
    if(sql.startsWith('select 1 from lola15.sessions')){const session=s.sessions.get(values[0]);return {rows:session===values[1]?[{}]:[]};}
    if(sql.startsWith('insert into lola15.sessions'))s.sessions.set(values[0],values[1]);
    if(sql.startsWith('delete from lola15.sessions where token_hash'))s.sessions.delete(values[0]);
    if(s.failWrite&&sql.startsWith('insert into lola15.rsvps'))throw Error('Isolated write failure');
    return {rows:[]};
   }
   export const database=()=>({query,connect:async()=>({query,release(){}})});
  `,
          }));
        },
      },
    ],
  });
  const loaded: any = new Module(
    path.join(process.cwd(), "tests/action-fixture.cjs"),
  );
  loaded.paths = (Module as any)._nodeModulePaths(process.cwd());
  loaded._compile(result.outputFiles[0].text, "action-fixture.cjs");
  actions = loaded.exports;
});
beforeEach(() => {
  (globalThis as any).__lolaActionFixture = {
    ready: true,
    cookies: new Map(),
    sessions: new Map(),
    calls: [],
    limit: 1,
    failWrite: false,
  };
  process.env.ADMIN_PASSWORD = "fixture-private-password-123";
});
test("review requires authorization before any guest or review query", async () => {
  const result = await actions.reviewRSVP(randomUUID(), "approved");
  assert.equal(result.success, false);
  assert.equal(state().calls.length, 0);
});
test("login uses opaque HttpOnly session cookies and hashes; logout revokes them", async () => {
  assert.equal((await actions.loginAdmin("wrong-password")).success, false);
  assert.equal(state().cookies.size, 0);
  assert.equal(
    (await actions.loginAdmin(process.env.ADMIN_PASSWORD)).success,
    true,
  );
  const cookie = state().cookies.get("lola15_admin");
  assert.match(cookie.value, /^[a-f0-9]{64}$/);
  assert.notEqual(cookie.value, process.env.ADMIN_PASSWORD);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "strict");
  assert(!JSON.stringify(state().calls).includes(process.env.ADMIN_PASSWORD!));
  assert.equal(state().sessions.size, 1);
  assert.equal((await actions.logoutAdmin()).success, true);
  assert.equal(state().sessions.size, 0);
  assert.equal(state().cookies.size, 0);
});
test("password changes invalidate the existing session before a review can mutate a response", async () => {
  await actions.loginAdmin(process.env.ADMIN_PASSWORD);
  state().calls = [];
  process.env.ADMIN_PASSWORD = "fixture-rotated-password-456";
  const result = await actions.reviewRSVP(randomUUID(), "approved");
  assert.equal(result.success, false);
  assert(!state().calls.some((call: any) => call.sql.startsWith("update")));
});
test("throttled logins and missing configuration never create a session", async () => {
  state().limit = 7;
  assert.equal(
    (await actions.loginAdmin(process.env.ADMIN_PASSWORD)).success,
    false,
  );
  assert.equal(state().sessions.size, 0);
  state().limit = 1;
  state().ready = false;
  assert.equal(
    (await actions.loginAdmin(process.env.ADMIN_PASSWORD)).success,
    false,
  );
  assert.equal(state().sessions.size, 0);
});
test("bad RSVP data and offline storage never pretend to be saved", async () => {
  assert.equal((await actions.submitRSVP({})).success, false);
  assert.equal(state().calls.length, 0);
  const input = {
    id: randomUUID(),
    contactName: "Persona de prueba",
    phone: "1131545678",
    attending: true,
    members: [{ name: "Persona de prueba", menu: "standard", notes: "" }],
    website: "",
  };
  state().ready = false;
  assert.equal((await actions.submitRSVP(input)).success, false);
  assert.equal(state().calls.length, 0);
  state().ready = true;
  state().failWrite = true;
  assert.equal((await actions.submitRSVP(input)).success, false);
  assert(state().calls.some((call: any) => call.sql === "rollback"));
});

test("cache refresh failures after commit do not turn a successful RSVP into a failed write", async (t) => {
  t.mock.method(console, "error", () => {});
  state().failRefresh = true;
  const input = {
    id: randomUUID(),
    contactName: "Persona guardada",
    phone: "1131545678",
    attending: true,
    members: [{ name: "Persona guardada", menu: "standard", notes: "" }],
    website: "",
  };
  assert.equal((await actions.submitRSVP(input)).success, true);
  assert(state().calls.some((call: any) => call.sql === "commit"));
});
