const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
);

export type ReceiptLine = { label: string; quantity: number; amount: number };

export function thermalReceiptHtml(input: {
  storeName: string; number: string; currency: string; lines: ReceiptLine[];
}): string {
  const rows = input.lines.map((line) =>
    `<tr><td>${escapeHtml(line.label)}</td><td>${line.quantity}</td><td>${line.amount.toFixed(2)}</td></tr>`,
  ).join("");
  const total = input.lines.reduce((sum, line) => sum + line.quantity * line.amount, 0);
  return `<!doctype html><html dir="auto"><head><meta charset="utf-8"><style>
@page{size:80mm auto;margin:4mm}body{font:12px Arial;width:72mm}table{width:100%}
td:last-child{text-align:right}@media print{button{display:none}}</style></head><body>
<h2>${escapeHtml(input.storeName)}</h2><p>${escapeHtml(input.number)}</p>
<table><tbody>${rows}</tbody></table><strong>Total: ${total.toFixed(2)} ${escapeHtml(input.currency)}</strong>
<button onclick="print()">Print</button></body></html>`;
}
