/**
 * Generate a real CSV file from an array of records and trigger a download.
 * The output reflects exactly the rows currently displayed to the user.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T; header: string }[],
): void {
  const cols =
    columns ??
    (rows.length > 0
      ? (Object.keys(rows[0]) as (keyof T)[]).map((key) => ({
          key,
          header: String(key),
        }))
      : []);

  const escape = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map((c) => escape(c.header)).join(",");
  const body = rows
    .map((row) => cols.map((c) => escape(row[c.key])).join(","))
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
