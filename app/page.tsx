import { event } from "@/lib/event";
import {
  Corner,
  Flourish,
  Star,
  QuillArrow,
  GothicArch,
} from "@/components/Ornaments";
import BrandLogo from "@/components/BrandLogo";
import GuestForms from "@/components/GuestForms";
import BackgroundMusic from "@/components/BackgroundMusic";
import { storageReady } from "@/lib/database";
import ShareButton from "@/components/ShareButton";
export const dynamic = "force-dynamic";

export default async function Page() {
  const date = event.date ? new Date(`${event.date}T12:00:00Z`) : null;
  const day = date
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        timeZone: event.timeZone,
      }).format(date)
    : "XV";
  const month = date
    ? new Intl.DateTimeFormat("es-AR", {
        month: "long",
        timeZone: event.timeZone,
      }).format(date)
    : "Una fecha especial";
  const year = date ? String(date.getUTCFullYear()) : "PRÓXIMAMENTE";

  return (
    <>
      <a href="#invitacion" className="skip-link">
        Ir a la invitación
      </a>
      <header className="site-header">
        <a href="#inicio" className="wordmark">
          <BrandLogo decorative />
          <span>
            LOLA <i>·</i> MIS XV
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#celebracion">La celebración</a>
          <a href="#vestimenta">Dress code</a>
          <a href="#confirmacion">Confirmar</a>
        </nav>
      </header>
      <main id="invitacion">
        <section id="inicio" className="hero" aria-labelledby="hero-title">
          <div className="hero-frame" aria-hidden="true">
            <Corner className="corner top-left" />
            <Corner className="corner top-right" />
            <Corner className="corner bottom-left" />
            <Corner className="corner bottom-right" />
            <Star className="frame-star star-top" />
            <Star className="frame-star star-bottom" />
          </div>
          <GothicArch />
          <img
            className="roses roses-top"
            src="/art/burgundy-roses.webp"
            alt=""
            width="1100"
            height="1005"
            fetchPriority="high"
          />
          <img
            className="roses roses-bottom"
            src="/art/burgundy-roses.webp"
            alt=""
            width="1100"
            height="1005"
          />
          <img
            className="roses roses-extra"
            src="/art/burgundy-roses.webp"
            alt=""
            width="1100"
            height="1005"
          />
          <div className="hero-content">
            <p className="eyebrow hero-eyebrow">Una noche. Mil recuerdos.</p>
            <p className="save-date">
              Save <span>the date</span>
            </p>
            <QuillArrow className="hero-flourish" />
            <div className="name-lockup">
              <h1
                id="hero-title"
                className={event.name.length > 8 ? "long-name" : undefined}
              >
                {event.name}
              </h1>
              <p>
                Mis <span>XV</span>
              </p>
            </div>
            <p className="date">
              {event.date ? (
                <time dateTime={event.date}>{event.dateShort}</time>
              ) : (
                event.dateShort
              )}
            </p>
            <a className="hero-invite" href="#celebracion">
              Estás invitado a mi historia <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="hero-side-note" aria-hidden="true">
            EL COMIENZO DE UN NUEVO CAPÍTULO
          </p>
        </section>
        <section
          id="celebracion"
          className="celebration"
          aria-labelledby="celebration-title"
        >
          <div className="section-intro">
            <span className="chapter">
              I <span aria-hidden="true">/</span> LA CELEBRACIÓN
            </span>
            <h2 id="celebration-title">
              Un nuevo <em>capítulo.</em>
            </h2>
            <p>
              Hay momentos que se sueñan durante mucho tiempo.
              <br />
              El mío está por llegar, y quiero compartirlo con vos.
            </p>
          </div>
          <div className="celebration-details">
            <article className="date-card">
              <Star />
              <p className="eyebrow">GUARDÁ ESTA FECHA</p>
              <span className="day">{day}</span>
              <p className="month">{month}</p>
              <p className="year">{year}</p>
              <div className="small-rule" />
              {event.time && <p className="event-time">{event.time} hs</p>}
              {event.date ? (
                <a
                  className="button button-silver"
                  href="/api/calendar"
                  download="mis-quince.ics"
                >
                  Agendar la fecha <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <p className="date-pending">Pronto, todos los detalles.</p>
              )}
            </article>
            <article className="story-card">
              <BrandLogo className="story-brand" tone="silver" />
              <p className="eyebrow">LA NOCHE NOS ESPERA</p>
              {event.venue ? (
                <>
                  <h3>{event.venue}</h3>
                  {event.address && <p>{event.address}</p>}
                  {event.mapsUrl && (
                    <a
                      className="text-link"
                      href={event.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Cómo llegar <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </>
              ) : (
                <>
                  <h3>
                    Lo mejor está
                    <br />
                    <em>por venir.</em>
                  </h3>
                  <p>
                    Muy pronto voy a compartir
                    <br />
                    el lugar y todos los detalles.
                  </p>
                </>
              )}
              <Flourish />
            </article>
          </div>
        </section>
        <section
          className="quote-section"
          aria-label="Un deseo para esta noche"
        >
          <img
            className="section-flowers"
            src="/art/burgundy-roses.webp"
            alt=""
            width="1100"
            height="1005"
            loading="lazy"
          />
          <Star />
          <blockquote>
            Que esta noche se convierta
            <br />
            en uno de esos recuerdos
            <br />
            <em>que duran para siempre.</em>
          </blockquote>
          <span className="quote-signature">Con amor, {event.name}</span>
        </section>
        <section
          id="vestimenta"
          className="dress-section"
          aria-labelledby="dress-title"
        >
          <img
            className="dress-flowers"
            src="/art/burgundy-roses.webp"
            alt=""
            width="1100"
            height="1005"
            loading="lazy"
          />
          <div className="dress-heading">
            <span className="chapter">
              II <span aria-hidden="true">/</span> EL ARTE DE CELEBRAR
            </span>
            <h2 id="dress-title">
              Una noche
              <br />
              para <em>vestirse de fiesta.</em>
            </h2>
            <p>
              Tu presencia es lo más importante.
              <br />
              Tu look también es parte de esta historia.
            </p>
          </div>
          <div className="dress-card">
            <svg
              className="hanger"
              viewBox="0 0 100 65"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M43 18a8 8 0 1 1 10 8l-3 2v6L7 54c-4 2-3 6 1 6h84c4 0 5-4 1-6L50 34"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M24 60c5-11 12-15 26-15s21 4 26 15"
                stroke="currentColor"
                strokeWidth=".7"
              />
            </svg>
            <p className="eyebrow">DRESS CODE</p>
            <h3>{event.dressCode}</h3>
            <div className="small-rule" />
            <p className="reserved-copy">
              Para acompañar la estética de la fiesta,
              <br />
              te pido evitar estos colores:
            </p>
            <ul className="color-list">
              {event.reservedColors.map((color, i) => (
                <li key={color}>
                  <span className={`swatch swatch-${i}`} aria-hidden="true" />
                  {color}
                </li>
              ))}
            </ul>
            <p className="dress-thanks">
              Gracias por ser parte de cada detalle.
            </p>
          </div>
        </section>
        <GuestForms enabled={await storageReady()} />
        <section className="closing">
          <img
            className="closing-flowers"
            src="/art/burgundy-roses.webp"
            alt=""
            width="1100"
            height="1005"
            loading="lazy"
          />
          <BrandLogo className="closing-brand" />
          <Flourish />
          <p className="eyebrow">EL PRÓXIMO CAPÍTULO LO ESCRIBIMOS JUNTOS</p>
          <h2>Te espero.</h2>
          <p className="closing-date">{event.dateLabel}</p>
          <ShareButton />
        </section>
        <BackgroundMusic
          src={process.env.NEXT_PUBLIC_BACKGROUND_MUSIC_URL || ""}
          title="thank u, next — Ariana Grande"
        />
      </main>
      <footer className="site-footer">
        <a
          href="#inicio"
          className="footer-monogram"
          aria-label="Volver al comienzo de la invitación de Lola"
        >
          <BrandLogo decorative />
        </a>
        <p>
          {event.name.toUpperCase()} <span>·</span> MIS XV <span>·</span> 2027
        </p>
        <a href="#inicio" className="back-top">
          Volver arriba <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </>
  );
}
