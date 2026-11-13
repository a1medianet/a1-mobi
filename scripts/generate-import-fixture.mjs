// Deterministic synthetic XLSX fixture: no customer data and no Microsoft Excel dependency.
import { zipSync, strToU8 } from "fflate";
import { writeFile } from "node:fs/promises";

const columns = [
  "category_code", "sku", "name_ar", "name_en", "type", "barcode",
  "cost", "base_price", "minimum_price", "low_stock", "serialized",
];
const product = [
  "ACCESSORY", "FIXTURE-001", "غطاء تجربة", "Fixture Case", "ACCESSORY",
  "FIXTURE0001", "2", "5", "3", "2", "false",
];
const encode = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${[columns,product].map((cells,index)=>`<row r="${index+1}">${cells.map((value,col)=>`<c r="${letters[col]}${index+1}" t="inlineStr"><is><t>${encode(value)}</t></is></c>`).join("")}</row>`).join("")}</sheetData>
</worksheet>`;
const files = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  "xl/worksheets/sheet1.xml": sheet,
};
await writeFile("tests/fixtures/catalog-import.xlsx", zipSync(Object.fromEntries(Object.entries(files).map(([name,xml])=>[name,strToU8(xml)])), { level: 6 }));
console.log("Synthetic XLSX fixture generated");
