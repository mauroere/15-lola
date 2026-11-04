import type { Member } from "./validation";
export type ResponseRecord = {
  id: string;
  contact_name: string;
  phone: string;
  attending: boolean;
  members: Member[];
  status: "pending" | "approved" | "rejected" | "superseded";
  created_at: string;
};
export const approvedPeople = (rows: ResponseRecord[]) =>
  rows
    .filter((row) => row.status === "approved" && row.attending)
    .flatMap((row) =>
      row.members.map((member) => ({
        ...member,
        contact: row.contact_name,
        phone: row.phone,
      })),
    );
/** Excel interprets formulas even in quoted CSV cells; escape that prefix too. */
export function csvCell(value: string) {
  const safe = /^[\s]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function attendanceCsv(rows: ResponseRecord[]) {
  const labels: Record<string, string> = {
    standard: "Sin restricciones",
    gluten_free: "Sin TACC",
    vegetarian: "Vegetariano",
    vegan: "Vegano",
    other: "Otra necesidad",
  };
  return (
    "\uFEFF" +
    [
      ["Persona", "Menú", "Necesidades alimentarias", "Respondió", "WhatsApp"],
      ...approvedPeople(rows).map((person) => [
        person.name,
        labels[person.menu],
        person.notes,
        person.contact,
        person.phone,
      ]),
    ]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n")
  );
}
