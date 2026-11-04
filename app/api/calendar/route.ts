import { event } from "@/lib/event";
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
export function GET() {
  if (!event.date)
    return new Response("La fecha todavía no está confirmada.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  // Save the date: evento de día completo, sin inventar un horario.
  const start = event.date.replaceAll("-", "");
  const followingDay = new Date(`${event.date}T12:00:00Z`);
  followingDay.setUTCDate(followingDay.getUTCDate() + 1);
  const end = followingDay.toISOString().slice(0, 10).replaceAll("-", "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mis quince//Invitacion//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:mis-quince-${start}@invitacion.local`,
    "DTSTAMP:20261104T000000Z",
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escape(`Los XV de ${event.name}`)}`,
    `DESCRIPTION:${escape("Guardá esta fecha. Dress code: elegante. Evitar bordó, plateado y blanco.")}`,
    ...(event.venue ? [`LOCATION:${escape(event.venue)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  // RFC 5545: fold by UTF-8 bytes; accented Spanish text must remain valid.
  const folded = lines
    .map((line) => {
      const parts: string[] = [];
      let part = "";
      for (const char of line) {
        if (Buffer.byteLength(part + char, "utf8") > 75) {
          parts.push(part);
          part = " ";
        }
        part += char;
      }
      parts.push(part);
      return parts.join("\r\n");
    })
    .join("\r\n");
  return new Response(folded, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-quince.ics"',
      "Cache-Control": "no-store",
    },
  });
}
