import { readSheet } from "read-excel-file/node";

/**
 * Read only XLSX worksheets, never execute macros or spreadsheet formulas.
 * Preserve text identifiers (SKU and barcode) instead of silently stripping leading zeroes.
 */
export async function productXlsxToCsv(bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength === 0 || bytes.byteLength > 1_000_000) throw new Error("INVALID_IMPORT_SIZE");
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("INVALID_XLSX_FORMAT");

  const rows = await readSheet(Buffer.from(bytes));
  if (rows.length < 2 || rows.length > 501) throw new Error("INVALID_IMPORT_ROW_COUNT");
  const headers = rows[0].map(cell => String(cell ?? "").trim().toLowerCase());
  const textIdentifierColumns = new Set(
    ["sku", "barcode", "category_code"].map(name => headers.indexOf(name)).filter(index => index >= 0),
  );
  const escapeCsv = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

  return rows.map((row, rowIndex) => row.map((cell, columnIndex) => {
    if (cell instanceof Date) throw new Error(`INVALID_DATE_CELL_ROW_${rowIndex + 1}`);
    if (rowIndex > 0 && textIdentifierColumns.has(columnIndex) && typeof cell === "number") {
      throw new Error(`IDENTIFIER_MUST_BE_TEXT_ROW_${rowIndex + 1}`);
    }
    return escapeCsv(cell == null ? "" : String(cell));
  }).join(",")).join("\r\n");
}
