import AdminPanel, {
  AdminLogin,
  type AdminRSVP,
  type AdminSong,
} from "@/components/AdminPanel";
import { isAdmin, adminConfigured } from "@/lib/admin";
import { database, storageReady } from "@/lib/database";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const ready = await storageReady();
  if (!ready || !(await isAdmin()))
    return <AdminLogin available={ready && adminConfigured()} />;
  const [rsvps, songs] = await Promise.all([
    database().query(
      "select * from lola15.rsvps order by created_at desc limit 1000",
    ),
    database().query(
      "select * from lola15.songs order by created_at desc limit 1000",
    ),
  ]);
  return (
    <AdminPanel
      rsvps={
        rsvps.rows.map((row) => ({
          ...row,
          created_at: new Date(row.created_at).toISOString(),
        })) as AdminRSVP[]
      }
      songs={
        songs.rows.map((row) => ({
          ...row,
          created_at: new Date(row.created_at).toISOString(),
        })) as AdminSong[]
      }
    />
  );
}
