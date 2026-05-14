/** Escape một ô CSV (RFC-style). */
export function escapeCsvCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Tải file .csv (UTF-8 có BOM để Excel hiển thị tiếng Việt đúng).
 * @param {string} filename - ví dụ hop-dong.csv
 * @param {string[]} headers - hàng tiêu đề
 * @param {Array<Array<string|number>>} rows - từng dòng dữ liệu
 */
export function downloadCsv(filename, headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const csv = `\uFEFF${[headerLine, ...bodyLines].join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
