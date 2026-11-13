/** Excel의 한글 인식과 RFC 4180의 필드·줄바꿈 규칙을 함께 지킨다. */
export function toCsv(rows: string[][]): string {
  return '\uFEFF' + rows.map((row) => row.map((value) =>
    /[,"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value,
  ).join(',')).join('\r\n');
}

export function downloadCsv(fileName: string, rows: string[][]): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.toLowerCase().endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // 브라우저가 다운로드를 시작하기 전에 URL을 해제하면 파일이 유실될 수 있다.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
