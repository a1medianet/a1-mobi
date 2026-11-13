/** Spreadsheet-safe CSV for authenticated exports. No user input may become a formula. */
export function safeCsvCell(value: unknown): string {
  const raw = String(value ?? "").replace(/\u0000/g, "").replace(/\r\n?/g, "\n");
  const sanitized = /^[\s\uFEFF\u200B]*[=+@\-\t\r]/u.test(raw) ? "'" + raw : raw;
  return '"' + sanitized.replace(/"/g, '""') + '"';
}
export function toExcelCsv(rows: readonly (readonly unknown[])[]): string {
  return "\uFEFF" + rows.map(row => row.map(safeCsvCell).join(",")).join("\r\n") + "\r\n";
}
