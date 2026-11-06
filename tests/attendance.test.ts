import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { attendanceWorkbook } from "../lib/attendance-workbook";
import {
  approvedPeople,
  attendanceCsv,
  csvCell,
  type ResponseRecord,
} from "../lib/attendance";
const row = (
  index: number,
  status: ResponseRecord["status"] = "approved",
): ResponseRecord => ({
  id: String(index),
  contact_name: "Contacto",
  phone: "5491131545678",
  attending: true,
  members: [{ name: `Persona ${index}`, menu: "standard", notes: "" }],
  status,
  created_at: "2026-11-04T00:00:00Z",
});
test("attendance and CSV include every approved person beyond 1000 responses, excluding rejected and pending", () => {
  const rows = [
    ...Array.from({ length: 1001 }, (_, i) => row(i)),
    row(1002, "pending"),
    row(1003, "rejected"),
  ];
  assert.equal(approvedPeople(rows).length, 1001);
  const csv = attendanceCsv(rows);
  assert(csv.includes("Persona 1000"));
  assert(!csv.includes("Persona 1002"));
  assert(!csv.includes("Persona 1003"));
});
test("CSV escapes formula prefixes, quotes and newlines supplied as names or dietary notes", () => {
  for (const value of ["=1+1", " +SUM(A1:A2)", "-1+2", "@formula", "\t=1+1"])
    assert(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('Ana "B"\nLopez'), '"Ana ""B""\nLopez"');
});
test("Excel workbook preserves accented headers and guest data as text, exporting only approved attendees", async () => {
  const approved = row(1);
  approved.contact_name = "María Núñez";
  approved.phone = "+54902324001234";
  approved.members = [{ name: "Ángela Muñoz", menu: "other", notes: '=1+1; sin maní & "piñón"' }];
  const blob = await attendanceWorkbook([approved, row(2, "pending"), row(3, "rejected")]);
  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const strings = strFromU8(files["xl/sharedStrings.xml"]);
  for (const text of ["Persona", "Menú", "Necesidades alimentarias", "Respondió", "WhatsApp", "Ángela Muñoz", "María Núñez", "+54902324001234", "sin maní", "piñón", "=1+1"])
    assert(strings.includes(text), `Missing original text: ${text}`);
  assert(!strings.includes("Persona 2"));
  assert(!strings.includes("Persona 3"));
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  assert.doesNotMatch(sheet, /<f[\s>]/);
  assert.equal((sheet.match(/<c\b[^>]*t="s"/g) || []).length, 10);
  assert(strFromU8(files["xl/workbook.xml"]).includes("Asistentes y menús"));
});
