"use client";
import { useRef, useState } from "react";
import { submitRSVP, suggestSong } from "@/app/actions";
import { mealOptions, type Member } from "@/lib/validation";
function useSubmission(
  action: (value: unknown) => Promise<{ success: boolean; error?: string }>,
) {
  const id = useRef("");
  const [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [error, setError] = useState("");
  async function send(value: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      id.current ||= crypto.randomUUID();
      const result = await action({ ...value, id: id.current });
      if (result.success) setSuccess(true);
      else setError(result.error || "No se pudo guardar. Volvé a intentar.");
    } catch {
      setError(
        "No se pudo conectar. Tus datos siguen en el formulario; podés reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { busy, success, error, send };
}
function MenuFields({
  member,
  onChange,
  prefix,
}: {
  member: Member;
  onChange: (value: Member) => void;
  prefix: string;
}) {
  return (
    <>
      <label htmlFor={`${prefix}-menu`}>
        Preferencia de menú
        <select
          id={`${prefix}-menu`}
          value={member.menu}
          onChange={(e) =>
            onChange({ ...member, menu: e.target.value as Member["menu"] })
          }
        >
          {mealOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${prefix}-notes`}>
        Alergias u otras necesidades {member.menu !== "other" && "(opcional)"}
        <textarea
          id={`${prefix}-notes`}
          maxLength={250}
          required={member.menu === "other"}
          value={member.notes}
          onChange={(e) => onChange({ ...member, notes: e.target.value })}
          rows={2}
        />
      </label>
    </>
  );
}
const blankMember = (): Member => ({ name: "", menu: "standard", notes: "" });
export default function GuestForms({ enabled }: { enabled: boolean }) {
  const rsvp = useSubmission(submitRSVP),
    song = useSubmission(suggestSong);
  const [contact, setContact] = useState(blankMember),
    [phone, setPhone] = useState(""),
    [attending, setAttending] = useState(true),
    [companions, setCompanions] = useState<Member[]>([]),
    [trap, setTrap] = useState("");
  const [songName, setSongName] = useState(""),
    [songTitle, setSongTitle] = useState(""),
    [songTrap, setSongTrap] = useState("");
  return (
    <>
      <section
        id="confirmacion"
        className="guest-section"
        aria-labelledby="rsvp-title"
      >
        <div className="form-intro">
          <p className="chapter">III / TU LUGAR EN ESTA HISTORIA</p>
          <h2 id="rsvp-title">Confirmá tu asistencia.</h2>
          <p>
            Me encantaría compartir esta noche con vos.
            <br />
            Contame quiénes vienen y si necesitan un menú especial.
          </p>
        </div>
        <div className="guest-form-card">
          {rsvp.success ? (
            <p className="form-success" role="status">
              Recibimos tu respuesta. Quedó pendiente de revisión por la
              organización. ¡Gracias por responder!
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void rsvp.send({
                  contactName: contact.name,
                  phone,
                  attending,
                  members: attending ? [contact, ...companions] : [],
                  website: trap,
                });
              }}
            >
              {!enabled && (
                <p className="form-notice" role="status">
                  La confirmación estará disponible muy pronto.
                </p>
              )}
              <fieldset disabled={!enabled || rsvp.busy}>
                <legend className="sr-only">
                  Tu respuesta y el menú de cada persona
                </legend>
                <div className="form-grid">
                  <label htmlFor="rsvp-name">
                    Tu nombre y apellido
                    <input
                      id="rsvp-name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={contact.name}
                      onChange={(e) =>
                        setContact({ ...contact, name: e.target.value })
                      }
                    />
                  </label>
                  <label htmlFor="rsvp-phone">
                    WhatsApp de contacto
                    <input
                      id="rsvp-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      minLength={8}
                      maxLength={40}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                </div>
                <label htmlFor="rsvp-attendance">
                  ¿Vas a venir?
                  <select
                    id="rsvp-attendance"
                    value={attending ? "yes" : "no"}
                    onChange={(e) => setAttending(e.target.value === "yes")}
                  >
                    <option value="yes">Sí, voy a asistir</option>
                    <option value="no">No podré asistir</option>
                  </select>
                </label>
                {attending && (
                  <>
                    <div className="member-menu">
                      <h3>Tu menú</h3>
                      <MenuFields
                        prefix="guest-main"
                        member={contact}
                        onChange={setContact}
                      />
                    </div>
                    {companions.map((member, index) => (
                      <div className="member-menu" key={index}>
                        <h3>Acompañante {index + 1}</h3>
                        <label htmlFor={`companion-${index}`}>
                          Nombre y apellido del acompañante {index + 1}
                          <input
                            id={`companion-${index}`}
                            required
                            minLength={2}
                            maxLength={100}
                            value={member.name}
                            onChange={(e) =>
                              setCompanions((current) =>
                                current.map((m, i) =>
                                  i === index
                                    ? { ...m, name: e.target.value }
                                    : m,
                                ),
                              )
                            }
                          />
                        </label>
                        <MenuFields
                          prefix={`companion-${index}`}
                          member={member}
                          onChange={(value) =>
                            setCompanions((current) =>
                              current.map((m, i) => (i === index ? value : m)),
                            )
                          }
                        />
                        <button
                          className="form-link"
                          type="button"
                          onClick={() =>
                            setCompanions((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Quitar acompañante {index + 1}
                        </button>
                      </div>
                    ))}
                    {companions.length < 11 && (
                      <button
                        type="button"
                        className="form-link add-person"
                        onClick={() =>
                          setCompanions((current) => [
                            ...current,
                            blankMember(),
                          ])
                        }
                      >
                        + Agregar acompañante
                      </button>
                    )}
                  </>
                )}
                <label className="honeypot" aria-hidden="true">
                  Dejar vacío
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={trap}
                    onChange={(e) => setTrap(e.target.value)}
                  />
                </label>
                <p className="form-privacy">
                  La organización usará estos datos para revisar la asistencia y
                  preparar los menús.
                </p>
                <button className="button button-wine" type="submit">
                  {rsvp.busy ? "Enviando…" : "Enviar respuesta"}
                </button>
              </fieldset>
              {rsvp.error && (
                <p className="form-error" role="alert">
                  {rsvp.error}
                </p>
              )}
            </form>
          )}
        </div>
      </section>
      <section
        id="canciones"
        className="song-section"
        aria-labelledby="song-title"
      >
        <div className="form-intro">
          <p className="chapter">IV / LA BANDA SONORA</p>
          <h2 id="song-title">Una canción para esta noche.</h2>
          <p>
            ¿Qué tema no puede faltar en la pista?
            <br />
            Dejá tu sugerencia y armemos una noche inolvidable.
          </p>
        </div>
        <div className="song-form-card">
          {song.success ? (
            <p className="form-success" role="status">
              ¡Gracias por tu sugerencia! Ya quedó guardada para la fiesta.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void song.send({
                  name: songName,
                  song: songTitle,
                  website: songTrap,
                });
              }}
            >
              {!enabled && (
                <p className="form-notice" role="status">
                  Muy pronto vas a poder dejar tu canción.
                </p>
              )}
              <fieldset disabled={!enabled || song.busy}>
                <legend className="sr-only">Sugerencia musical</legend>
                <label htmlFor="song-name">
                  Tu nombre
                  <input
                    id="song-name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={songName}
                    onChange={(e) => setSongName(e.target.value)}
                  />
                </label>
                <label htmlFor="song-track">
                  Canción y artista
                  <input
                    id="song-track"
                    required
                    minLength={2}
                    maxLength={160}
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                  />
                </label>
                <label className="honeypot" aria-hidden="true">
                  Dejar vacío
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={songTrap}
                    onChange={(e) => setSongTrap(e.target.value)}
                  />
                </label>
                <button className="button button-silver" type="submit">
                  {song.busy ? "Enviando…" : "Sugerir canción"}
                </button>
              </fieldset>
              {song.error && (
                <p className="form-error" role="alert">
                  {song.error}
                </p>
              )}
            </form>
          )}
        </div>
      </section>
    </>
  );
}
