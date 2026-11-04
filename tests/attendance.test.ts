import { test } from "node:test";
import assert from "node:assert/strict";
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
