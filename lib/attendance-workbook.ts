import writeXlsxFile from "write-excel-file/universal";
import { attendanceRows, type ResponseRecord } from "./attendance";

export function attendanceWorkbook(rows: ResponseRecord[]): Promise<Blob> {
  return writeXlsxFile(
    attendanceRows(rows).map((row, index) =>
      row.map((value) => ({
        // Text cells preserve phone numbers and never execute guest input as formulas.
        type: String,
        value,
        ...(index === 0 ? { fontWeight: "bold" as const } : {}),
      })),
    ),
    {
      sheet: "Asistentes y menús",
      columns: [28, 22, 55, 28, 22].map((width) => ({ width })),
    },
  ).toBlob();
}
