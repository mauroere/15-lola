"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, logoutAdmin, reviewRSVP } from "@/app/actions";
import { mealOptions, type Member } from "@/lib/validation";
import { approvedPeople } from "@/lib/attendance";
import { attendanceWorkbook } from "@/lib/attendance-workbook";
import { nameKey, searchKey } from "@/lib/identity";
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
    [filter, setFilter] = useState("pending"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [songPage, setSongPage] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!inFlight.current && document.visibilityState === "visible")
        router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);
  const approved = approvedPeople(rsvps),
    labels = {
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
      superseded: "Reemplazada",
    };
  const filtered = rsvps.filter(
    (row) =>
      (!filter || row.status === filter) &&
      (searchKey(
        [
          row.contact_name,
          row.phone,
          ...row.members.map((member) => member.name),
        ].join(" "),
      ).includes(searchKey(query)) ||
        (/^[+\d\s()-]+$/.test(query) &&
          query.replace(/\D/g, "").length >= 4 &&
          row.phone.includes(query.replace(/\D/g, "")))),
  );
  const approvedContacts = new Map<string, Set<string>>();
  for (const response of rsvps.filter((row) => row.status === "approved")) {
    if (!approvedContacts.has(response.phone))
      approvedContacts.set(response.phone, new Set());
    approvedContacts.get(response.phone)!.add(nameKey(response.contact_name));
  }
  const pages = Math.max(1, Math.ceil(filtered.length / 25)),
    currentPage = Math.min(page, pages - 1);
  const songPages = Math.max(1, Math.ceil(songs.length / 25)),
    currentSongPage = Math.min(songPage, songPages - 1);
  async function exportList() {
    try {
      const url = URL.createObjectURL(
          await attendanceWorkbook(rsvps),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "lola-asistentes-y-menus.xlsx";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("No se pudo descargar la lista. Volvé a intentar.");
    }
  }
  function review(row: AdminRSVP, status: "approved" | "rejected") {
    const previous = row.status;
    if (previous === "superseded") return;
    void run(() => reviewRSVP(row.id, status, previous));
  }
  async function run(
    work: () => Promise<{
      success: boolean;
      error?: string;
      authRequired?: boolean;
    }>,
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await work();
      if (result.success) router.refresh();
      else {
        setError(result.error || "No se pudo guardar.");
        if (result.authRequired) router.refresh();
      }
    } catch {
      setError("No se pudo conectar. Reintentá.");
    } finally {
      inFlight.current = false;
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
      <div className="button-row admin-tools">
        <button
          type="button"
          className="form-link"
          disabled={busy}
          onClick={() => router.refresh()}
        >
          Actualizar panel
        </button>
        <button type="button" className="form-link" onClick={exportList}>
          Descargar asistentes y menús
        </button>
      </div>
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
      <label htmlFor="review-query">
        Buscar por nombre o WhatsApp
        <input
          type="search"
          id="review-query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </label>
      <label htmlFor="review-filter">
        Mostrar respuestas
        <select
          id="review-filter"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="superseded">Reemplazadas</option>
          <option value="">Todas</option>
        </select>
      </label>
      <section aria-label="Respuestas de asistencia">
        {filtered.slice(currentPage * 25, (currentPage + 1) * 25).map((row) => (
          <article className="admin-response" key={row.id}>
            <h2>Respondió: {row.contact_name}</h2>
            <p className="response-time">
              Enviada el{" "}
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(row.created_at))}
            </p>
            <p>
              {labels[row.status]} ·{" "}
              {row.attending ? "Asistirá" : "No podrá asistir"} · {row.phone}
            </p>
            <p>
              <strong>Personas que asistirán:</strong>{" "}
              {row.attending ? row.members.length : 0}
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
                disabled={
                  busy ||
                  row.status === "approved" ||
                  row.status === "superseded"
                }
                onClick={() => review(row, "approved")}
              >
                Aprobar respuesta de {row.contact_name}
              </button>
              <button
                className="button"
                disabled={
                  busy ||
                  row.status === "rejected" ||
                  row.status === "superseded"
                }
                onClick={() => review(row, "rejected")}
              >
                Rechazar respuesta de {row.contact_name}
              </button>
            </div>
          </article>
        ))}
        {!filtered.length && <p>No hay respuestas en esta vista.</p>}
      </section>
      {pages > 1 && (
        <div className="admin-pagination">
          <button
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </button>
          <span>
            Respuestas: página {currentPage + 1} de {pages}
          </span>
          <button
            disabled={currentPage === pages - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
      <section className="admin-songs">
        <h2>Canciones sugeridas</h2>
        {songs.length ? (
          songs
            .slice(currentSongPage * 25, (currentSongPage + 1) * 25)
            .map((song) => (
              <article className="admin-response" key={song.id}>
                <h3>{song.song}</h3>
                <p>{song.name}</p>
              </article>
            ))
        ) : (
          <p>Todavía no hay sugerencias.</p>
        )}
      </section>
      {songPages > 1 && (
        <div className="admin-pagination">
          <button
            disabled={currentSongPage === 0}
            onClick={() => setSongPage(currentSongPage - 1)}
          >
            Canciones anteriores
          </button>
          <span>
            Página {currentSongPage + 1} de {songPages}
          </span>
          <button
            disabled={currentSongPage === songPages - 1}
            onClick={() => setSongPage(currentSongPage + 1)}
          >
            Más canciones
          </button>
        </div>
      )}
      <p className="admin-limit">
        Los totales incluyen todas las respuestas aprobadas. El panel se
        actualiza cada 30 segundos mientras está visible.
      </p>
    </main>
  );
}
