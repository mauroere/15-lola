"use client";
import { useRef, useState } from "react";
import { submitRSVP, suggestSong } from "@/app/actions";
import { mealOptions, type Member } from "@/lib/validation";
function useSubmission(
  action: (value: unknown) => Promise<{ success: boolean; error?: string }>,
) {
  const request = useRef<{ id: string; signature: string } | null>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [error, setError] = useState("");
  async function send(value: Record<string, unknown>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const signature = JSON.stringify(value);
      if (request.current?.signature !== signature)
        request.current = { id: crypto.randomUUID(), signature };
      const result = await action({ ...value, id: request.current.id });
      if (result.success) setSuccess(true);
      else setError(result.error || "No se pudo guardar. Volvé a intentar.");
    } catch {
      setError(
        "No se pudo conectar. Tus datos siguen en el formulario; podés reintentar.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function reset() {
    if (inFlight.current) return;
    request.current = null;
    setSuccess(false);
    setError("");
  }
  return { busy, success, error, send, reset };
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
    [contactAttending, setContactAttending] = useState(true),
    [companions, setCompanions] = useState<Member[]>([]),
    [trap, setTrap] = useState("");
  const [songName, setSongName] = useState(""),
    [songTitle, setSongTitle] = useState(""),
    [songTrap, setSongTrap] = useState("");
  const members = attending
    ? [...(contactAttending ? [contact] : []), ...companions]
    : [];
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
            Anotá solo a las personas invitadas en el mensaje que recibiste y su
            menú.
          </p>
        </div>
        <div className="guest-form-card">
          {rsvp.success ? (
            <div className="response-summary">
              <p className="form-success" role="status">
                Recibimos tu respuesta. Quedó pendiente de revisión por la
                organización.
              </p>
              <p>
                <strong>Responde:</strong> {contact.name}
              </p>
              <p>
                <strong>Asistencia:</strong>{" "}
                {attending
                  ? `${members.length} ${members.length === 1 ? "persona" : "personas"}`
                  : "No podremos asistir"}
              </p>
              {attending && (
                <ul>
                  {members.map((member, index) => (
                    <li key={index}>
                      {member.name} ·{" "}
                      {
                        mealOptions.find(
                          (option) => option.value === member.menu,
                        )?.label
                      }
                    </li>
                  ))}
                </ul>
              )}
              <p>La organización recibe esta respuesta en su panel privado.</p>
              <button type="button" className="form-link" onClick={rsvp.reset}>
                Corregir mi respuesta
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void rsvp.send({
                  contactName: contact.name,
                  phone,
                  attending,
                  members,
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
                  ¿Van a venir?
                  <select
                    id="rsvp-attendance"
                    value={attending ? "yes" : "no"}
                    onChange={(e) => setAttending(e.target.value === "yes")}
                  >
                    <option value="yes">Sí, confirmamos asistencia</option>
                    <option value="no">No podremos asistir</option>
                  </select>
                </label>
                {attending && (
                  <>
                    <p className="form-privacy">
                      Podés responder por otras personas aunque no vayas a
                      asistir.
                    </p>
                    <label className="contact-attending">
                      <input
                        type="checkbox"
                        checked={contactAttending}
                        disabled={!contactAttending && companions.length >= 12}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setContactAttending(checked);
                          setCompanions((current) =>
                            checked
                              ? current.filter(
                                  (person) =>
                                    person.name.trim() ||
                                    person.notes.trim() ||
                                    person.menu !== "standard",
                                )
                              : current.length
                                ? current
                                : [blankMember()],
                          );
                        }}
                      />
                      Yo también voy a asistir
                    </label>
                    {contactAttending && (
                      <div className="member-menu">
                        <h3>Tu menú</h3>
                        <MenuFields
                          prefix="guest-main"
                          member={contact}
                          onChange={setContact}
                        />
                      </div>
                    )}
                    {companions.map((member, index) => (
                      <div className="member-menu" key={index}>
                        <h3>Persona invitada {index + 1}</h3>
                        <label htmlFor={`companion-${index}`}>
                          Nombre y apellido de la persona invitada {index + 1}
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
                          disabled={
                            !contactAttending && companions.length === 1
                          }
                          onClick={() =>
                            setCompanions((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Quitar persona invitada {index + 1}
                        </button>
                      </div>
                    ))}
                    {companions.length < (contactAttending ? 11 : 12) && (
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
                        + Agregar persona invitada
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
            <div>
              <p className="form-success" role="status">
                ¡Gracias por tu sugerencia! Ya quedó guardada para la fiesta.
              </p>
              <button
                type="button"
                className="form-link"
                onClick={() => {
                  setSongTitle("");
                  song.reset();
                }}
              >
                Sugerir otra canción
              </button>
            </div>
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
