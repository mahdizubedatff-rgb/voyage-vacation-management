/** Escapes a value for RFC 4180 CSV, and neutralises spreadsheet formula injection. */
export function escapeCsvValue(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [headers.map(escapeCsvValue).join(","), ...rows.map((row) => row.map(escapeCsvValue).join(","))];
  return lines.join("\r\n") + "\r\n";
}

/** UTF-8 byte order mark so Excel detects the encoding of non-ASCII destination names. */
export const UTF8_BOM = "﻿";
