import type { RSVPInput, SongInput } from "./validation";
export type SQLClient = {
  query: (sql: string, values?: any[]) => Promise<{ rows: any[] }>;
};
export async function consumeLimit(
  client: SQLClient,
  key: string,
  max: number,
  seconds = 600,
) {
  const bucket = new Date(
    Math.floor(Date.now() / (seconds * 1000)) * seconds * 1000,
  ).toISOString();
  const { rows } = await client.query(
    "insert into lola15.rate_limits(key,bucket,count) values($1,$2,1) on conflict(key,bucket) do update set count=lola15.rate_limits.count+1 returning count",
    [key, bucket],
  );
  return Number(rows[0].count) <= max;
}
export async function saveGuestRequest(
  client: SQLClient,
  kind: "rsvp" | "song",
  input: RSVPInput | SongInput,
  key: string,
) {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      kind + input.id,
    ]);
    const table = kind === "rsvp" ? "lola15.rsvps" : "lola15.songs";
    const existing = await client.query(`select id from ${table} where id=$1`, [
      input.id,
    ]);
    if (existing.rows.length) {
      await client.query("commit");
      return;
    }
    if (
      !(await consumeLimit(client, kind + ":" + key, kind === "rsvp" ? 5 : 10))
    )
      throw Error("RATE_LIMIT");
    if (kind === "rsvp") {
      const data = input as RSVPInput;
      await client.query(
        "insert into lola15.rsvps(id,contact_name,phone,attending,members) values($1,$2,$3,$4,$5::jsonb)",
        [
          data.id,
          data.contactName,
          data.phone,
          data.attending,
          JSON.stringify(data.members),
        ],
      );
    } else {
      const data = input as SongInput;
      await client.query(
        "insert into lola15.songs(id,name,song) values($1,$2,$3)",
        [data.id, data.name, data.song],
      );
    }
    await client.query(
      "delete from lola15.rate_limits where bucket<now()-interval '1 day'",
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
export async function reviewGuestRequest(
  client: SQLClient,
  id: string,
  status: "approved" | "rejected",
) {
  await client.query("begin");
  try {
    const { rows } = await client.query(
      "select phone,lower(btrim(contact_name)) as name from lola15.rsvps where id=$1",
      [id],
    );
    if (!rows.length) throw Error("NOT_FOUND");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
      "review:" + rows[0].phone + ":" + rows[0].name,
    ]);
    if (status === "approved")
      await client.query(
        "update lola15.rsvps set status='superseded',reviewed_at=now() where phone=$1 and lower(btrim(contact_name))=$2 and status='approved' and id<>$3",
        [rows[0].phone, rows[0].name, id],
      );
    await client.query(
      "update lola15.rsvps set status=$2,reviewed_at=now() where id=$1",
      [id, status],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
