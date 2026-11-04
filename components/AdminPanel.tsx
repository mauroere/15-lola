"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, logoutAdmin, reviewRSVP } from "@/app/actions";
import { mealOptions, type Member } from "@/lib/validation";
import BrandLogo from "./BrandLogo";
export type AdminRSVP = {
  id: string;
  contact_name: string;
  phone: string;
  attending: boolean;
  members: Member[];
  status: "pending" | "approved" | "rejected" | "superseded";
  created_at: string;
};
export type AdminSong = {
  id: string;
  name: string;
  song: string;
  created_at: string;
};
export function AdminLogin({ available }: { available: boolean }) {
  const router = useRouter(),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="admin-page">
      <a href="/" className="admin-home">
        <BrandLogo decorative />
        Volver a la invitación
      </a>
      <section className="admin-login">
        <h1>Panel de Lola</h1>
        <p>Asistencia, menús y canciones.</p>
        {!available && (
          <p role="status">
            El panel estará disponible cuando se complete su configuración.
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await loginAdmin(password);
              if (r.success) {
                setPassword("");
                router.refresh();
              } else setError(r.error || "No se pudo ingresar.");
            } catch {
              setError("No se pudo conectar. Reintentá.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="admin-password">
            Contraseña
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!available || busy}
            />
          </label>
          <button className="button button-wine" disabled={!available || busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}
export default function AdminPanel({
  rsvps,
  songs,
}: {
  rsvps: AdminRSVP[];
  songs: AdminSong[];
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("pending");
  const approved = rsvps
      .filter((row) => row.status === "approved" && row.attending)
      .flatMap((row) => row.members),
    labels = {
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
      superseded: "Reemplazada",
    };
  async function run(
    work: () => Promise<{ success: boolean; error?: string }>,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await work();
      if (result.success) router.refresh();
      else setError(result.error || "No se pudo guardar.");
    } catch {
      setError("No se pudo conectar. Reintentá.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/" className="admin-home">
          <BrandLogo decorative />
          Invitación de Lola
        </a>
        <button
          className="form-link"
          disabled={busy}
          onClick={() => void run(logoutAdmin)}
        >
          Cerrar sesión
        </button>
      </header>
      <h1>Asistencia y menús</h1>
      <p>
        {rsvps.filter((r) => r.status === "pending").length} respuestas
        pendientes · {approved.length} asistentes aprobados · {songs.length}{" "}
        canciones
      </p>
      {error && <p role="alert">{error}</p>}
      <section className="admin-meals" aria-label="Menús aprobados">
        {mealOptions.map((option) => (
          <article key={option.value}>
            <strong>
              {approved.filter((person) => person.menu === option.value).length}
            </strong>
            <span>{option.label}</span>
          </article>
        ))}
      </section>
      <p>
        Los menús cuentan solo las respuestas aprobadas. Al aprobar una nueva
        respuesta del mismo nombre y WhatsApp, la anterior queda reemplazada.
      </p>
      <label htmlFor="review-filter">
        Mostrar respuestas
        <select
          id="review-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="">Todas</option>
        </select>
      </label>
      <section aria-label="Respuestas de asistencia">
        {rsvps
          .filter((row) => !filter || row.status === filter)
          .map((row) => (
            <article className="admin-response" key={row.id}>
              <h2>{row.contact_name}</h2>
              <p>
                {labels[row.status]} ·{" "}
                {row.attending ? "Asistirá" : "No podrá asistir"} · {row.phone}
              </p>
              {row.members.map((person, index) => (
                <p key={index}>
                  <strong>{person.name}</strong> ·{" "}
                  {
                    mealOptions.find((option) => option.value === person.menu)
                      ?.label
                  }
                  {person.notes && ` · ${person.notes}`}
                </p>
              ))}
              <div className="button-row">
                <button
                  className="button button-wine"
                  disabled={busy || row.status === "approved"}
                  onClick={() => void run(() => reviewRSVP(row.id, "approved"))}
                >
                  Aprobar respuesta de {row.contact_name}
                </button>
                <button
                  className="button"
                  disabled={busy || row.status === "rejected"}
                  onClick={() => void run(() => reviewRSVP(row.id, "rejected"))}
                >
                  Rechazar respuesta de {row.contact_name}
                </button>
              </div>
            </article>
          ))}
        {!rsvps.some((row) => !filter || row.status === filter) && (
          <p>No hay respuestas en esta vista.</p>
        )}
      </section>
      <section className="admin-songs">
        <h2>Canciones sugeridas</h2>
        {songs.length ? (
          songs.map((song) => (
            <article className="admin-response" key={song.id}>
              <h3>{song.song}</h3>
              <p>{song.name}</p>
            </article>
          ))
        ) : (
          <p>Todavía no hay sugerencias.</p>
        )}
      </section>
      <p className="admin-limit">
        Se muestran las últimas 1000 respuestas y canciones.
      </p>
    </main>
  );
}
