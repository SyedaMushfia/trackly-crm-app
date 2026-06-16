type CSVValue = string | number | boolean | null | undefined;

function escapeCSVField(value: CSVValue): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Converts headers + rows into a CSV-formatted string (no BOM). */
export function rowsToCSV(headers: string[], rows: CSVValue[][]): string {
  const lines = [headers.map(escapeCSVField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCSVField).join(","));
  }
  return lines.join("\r\n");
}

/** Triggers a browser download of the given CSV content. */
export function downloadCSV(filename: string, csvContent: string) {
  // BOM ensures Excel opens UTF-8 content (e.g. accented names) correctly
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Today's date as YYYY-MM-DD, for use in export filenames. */
export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Fetches a file from an authenticated endpoint and triggers a browser
 *  download, using the filename from Content-Disposition if present. */
export async function downloadFromEndpoint(url: string, fallbackFilename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="(.+)"/);
  const filename = match?.[1] ?? fallbackFilename;

  const objUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objUrl);
}