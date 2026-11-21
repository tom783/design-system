/** accept는 선택기의 힌트이므로 드롭에도 같은 확장자·MIME 검사를 적용한다. 서버 검증은 앱 몫이다. */
export function acceptsFile(file: Pick<File, 'name' | 'type'>, accept = '') {
  const rules = accept.toLowerCase().split(',').map(rule => rule.trim()).filter(Boolean);
  return !rules.length || rules.some(rule => rule.startsWith('.') ? file.name.toLowerCase().endsWith(rule)
    : rule.endsWith('/*') ? file.type.toLowerCase().startsWith(rule.slice(0, -1)) : file.type.toLowerCase() === rule);
}
export function formatFileSize(bytes: number) {
  if (bytes < 1000) return `${bytes}B`;
  if (bytes < 1_000_000) return `${Number((bytes / 1000).toFixed(1))}KB`;
  if (bytes < 1_000_000_000) return `${Number((bytes / 1_000_000).toFixed(1))}MB`;
  return `${Number((bytes / 1_000_000_000).toFixed(1))}GB`;
}
export function acceptMessage(accept = '') {
  const names: Record<string, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/gif': 'GIF', 'image/*': '이미지', 'video/*': '동영상', 'audio/*': '오디오', 'application/pdf': 'PDF', 'application/vnd.ms-excel': 'XLS', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX' };
  const types = [...new Set(accept.toLowerCase().split(',').map(rule => rule.trim()).filter(Boolean).map(rule => names[rule] ?? rule.replace(/^\./, '').toUpperCase()))];
  return `${types.join('·')}만 올릴 수 있습니다`;
}
export function validateFiles(files: File[], options: { accept?: string; maxSize?: number; multiple?: boolean; maxFiles?: number; count: number }) {
  const { accept, maxSize, multiple = false, maxFiles, count } = options;
  const limit = multiple ? Math.max(0, Math.floor(maxFiles ?? Infinity)) : 1;
  const accepted: File[] = [], rejected: { file: File; reason: string }[] = [];
  for (const file of files) {
    const reason = !acceptsFile(file, accept) ? acceptMessage(accept)
      : maxSize !== undefined && file.size > maxSize ? `${formatFileSize(maxSize)} 이하만 올릴 수 있습니다`
      : (multiple ? count : 0) + accepted.length >= limit ? `최대 ${limit}개까지 올릴 수 있습니다` : '';
    if (reason) rejected.push({ file, reason }); else accepted.push(file);
  }
  return { accepted, rejected };
}
